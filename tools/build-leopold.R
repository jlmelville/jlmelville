# Rebuild from the repository root with Rscript tools/build-leopold.R
# Dependencies: snedata, FNN, uwot, jsonlite, ragg and the zip executable.
# The checked-in experiment used R 4.5.2 and uwot 0.2.4.
library(grid)

set.seed(42)
example <- snedata::two_different_clusters_data(n = 5000, dim = 50, scale = 10)
x <- as.matrix(example[setdiff(names(example), "color")])
groups <- split(seq_len(nrow(x)), factor(example$color, levels = c("#003399", "#FF9900")))
stopifnot(identical(as.integer(lengths(groups)), c(5000L, 5000L)), ncol(x) == 50)

# Include self as the first neighbor, as expected by uwot. Reuse this exact
# graph, the same label-blind initialization, seed and optimizer for each fit.
knn <- FNN::get.knn(x, k = 29, algorithm = "brute")
neighbors <- list(idx = cbind(seq_len(nrow(x)), knn$nn.index),
                  dist = cbind(0, knn$nn.dist))
set.seed(42)
initial <- matrix(runif(2 * nrow(x), -10, 10), ncol = 2)
settings <- (0:10) / 10
center <- function(points) sweep(points, 2, colMeans(points))
radius <- function(points) sqrt(mean(rowSums(center(points)^2)))
spread_ratio <- function(coords) radius(coords[groups[[1]], ]) / radius(coords[groups[[2]], ])

fits <- lapply(settings, function(s) {
  message("Fitting density scale ", s)
  coords <- uwot::umap(x, nn_method = neighbors, n_neighbors = 30,
                       min_dist = 0.1, n_epochs = 700, init = initial,
                       dens_scale = if (s == 0) NULL else s,
                       seed = 42, n_sgd_threads = 1, n_threads = 1,
                       verbose = FALSE)
  message(sprintf("  wide / tight RMS radius: %.3f", spread_ratio(coords)))
  coords
})

# Coordinates are centered separately for comparison. Keep the original
# centroids in the same units so the explorer can restore the embedding.
colors <- c("#256687", "#CB5829")
paper <- "#F8F6EE"
ink <- "#172C31"
mid <- "#476065"
rule <- "#CFD3C8"
blue <- "#174F68"

prepare_fit <- function(coords, s) {
  clouds <- lapply(groups, function(i) coords[i, , drop = FALSE])
  wide_radius <- radius(clouds[[1]])
  clouds_centered <- lapply(clouds, function(z) center(z) / wide_radius)
  centers <- lapply(clouds, function(z) as.numeric(colMeans(z) / wide_radius))
  xy <- do.call(rbind, clouds_centered)
  packed <- round(10000 * as.vector(t(xy)))
  stopifnot(max(abs(packed)) <= 32767)
  bytes <- writeBin(as.integer(packed), raw(), size = 2, endian = "little")
  data <- list(scale = s, ratio = spread_ratio(coords), centers = unname(centers),
               xy = gsub("\n", "", jsonlite::base64_enc(bytes), fixed = TRUE))
  list(data = data, clouds = clouds_centered)
}
prepared <- Map(prepare_fit, fits, settings)
input_ratio <- spread_ratio(x)
payload <- list(n = length(groups[[1]]), input = input_ratio, precision = 10000,
                uwot = as.character(packageVersion("uwot")),
                fits = lapply(prepared, "[[", "data"))
html_path <- "docs/leopold.html"
html <- readLines(html_path, warn = FALSE, encoding = "UTF-8")
data_start <- which(trimws(html) == '<script type="application/json" id="leopold-data">')
stopifnot(length(data_start) == 1L)
data_end <- min(which(seq_along(html) > data_start & trimws(html) == "</script>"))
stopifnot(is.finite(data_end))
encoded <- jsonlite::toJSON(payload, auto_unbox = TRUE, digits = 8, pretty = TRUE)
writeLines(c(html[seq_len(data_start)], encoded, html[data_end:length(html)]),
           html_path, useBytes = TRUE)
# GitHub serves raw HTML as plain text. The archive downloads as a file and
# contains just the self-contained explorer, ready to open offline.
stopifnot(utils::zip("docs/leopold.zip", html_path, flags = "-qjX") == 0L)

# Work in logical pixels and render at twice that resolution. A separate
# portrait layout keeps the type readable when GitHub displays it on a phone.
draw_figure <- function(path, mobile = FALSE) {
  w <- if (mobile) 430 else 900
  h <- if (mobile) 566 else 340
  ragg::agg_png(path, width = 2*w, height = 2*h, res = 144, background = paper)
  on.exit(dev.off())
  grid.newpage()
  pushViewport(viewport(xscale = c(0, w), yscale = c(h, 0)))
  u <- function(v) unit(v, "native")
  label <- function(text, px, py, size, color = ink, bold = FALSE, align = "left",
                    family = "Inter") {
    grid.text(text, u(px), u(py), just = c(align, "centre"),
              gp = gpar(fontfamily = family, fontsize = size, col = color,
                        fontface = if (bold) "bold" else "plain"))
  }
  line <- function(x1, y1, x2, y2, color = rule) {
    grid.segments(u(x1), u(y1), u(x2), u(y2), gp = gpar(col = color, lwd = 0.9))
  }
  draw_clouds <- function(fit, xs, cy, zoom, dot) {
    for (i in 1:2) {
      cloud <- fit$clouds[[i]]
      line(xs[i] - 5, cy, xs[i] + 5, cy, "#A6B1A8")
      line(xs[i], cy - 5, xs[i], cy + 5, "#A6B1A8")
      grid.circle(u(xs[i] + cloud[, 1]*zoom), u(cy - cloud[, 2]*zoom),
                  r = unit(dot, "points"),
                  gp = gpar(col = NA, fill = adjustcolor(colors[i], alpha.f = 0.43)))
    }
  }
  margin <- if (mobile) 17 else 27
  label("Wide-to-tight spread", margin, if (mobile) 28 else 34,
        if (mobile) 25 else 31, bold = TRUE)
  label(sprintf("50D input  %.1f×", input_ratio), w-margin, if (mobile) 29 else 35,
        if (mobile) 15 else 19, blue, TRUE, "right")
  line(margin, if (mobile) 55 else 63, w-margin, if (mobile) 55 else 63)
  # An unambiguous compact legend follows the left-to-right position of each group.
  legend_item <- function(x, y, color, text) {
    grid.circle(u(x), u(y), r = unit(4, "points"), gp = gpar(fill=color, col=NA))
    label(text, x+11, y, if (mobile) 14 else 17, mid)
  }
  legend_item(margin+4, if (mobile) 77 else 87, colors[1], "Wide input group")
  legend_item(margin+if (mobile) 176 else 210, if (mobile) 77 else 87, colors[2],
              "Tight input group")
  chosen <- match(c(0, 0.5, 1), settings)
  for (j in 1:3) {
    fit <- prepared[[chosen[j]]]
    method <- c("UMAP", "LEOPOLD", "LEOPOLD")[j]
    setting <- sprintf("density scale %.1f", fit$data$scale)
    ratio <- sprintf("%.1f×", fit$data$ratio)
    if (mobile) {
      top <- 111 + (j-1)*139
      label(method, margin, top+14, 18, ink, TRUE)
      label(setting, margin, top+39, 14, mid)
      label(ratio, margin, top+83, 33, blue, TRUE)
      draw_clouds(fit, c(234, 360), top+63, 33, 0.71)
      line(margin, top+121, w-margin, top+121)
    } else {
      left <- margin + (j-1)*289
      if (j > 1) line(left-11, 113, left-11, 293)
      label(method, left, 127, 18, ink, TRUE)
      label(setting, left+264, 127, 17, mid, align = "right")
      draw_clouds(fit, left+c(73,204), 204, 34, 0.72)
      label(ratio, left+132, 282, 37, blue, TRUE, "center")
    }
  }
  if (!mobile) line(margin, 306, w-margin, 306)
  label(if (mobile) "Each pair is centered and scaled to its wide group."
        else "Groups centered separately. Each pair uses its wide group as the unit of spread.",
        margin, if (mobile) 541 else 325, if (mobile) 14 else 17, mid)
}
draw_figure("images/leopold-spread.png")
draw_figure("images/leopold-spread-mobile.png", mobile = TRUE)
