# From the homepage repository root: Rscript study/crossover.R
library(smallvis)
library(zufft)
library(jsonlite)

set.seed(27)
n <- 12000L
group <- sample.int(4, n, replace = TRUE, prob = c(.3, .25, .25, .2))
a <- rnorm(n)
b <- rnorm(n)
base <- cbind(
  c(-7, 4, -2, 8)[group] + a * c(2.5, 3.8, 1.7, 2)[group],
  c(-1, -5, 6, 5)[group] + a * c(.9, -.7, 1.7, .2)[group] +
    b * c(1.4, 1.4, 2, 2.1)[group]
)

fft <- smallvis:::zufft_tsne_sums(1, 1L, TRUE)
tree <- smallvis:::mutual_settings(.35, 1L)$sums
hybrid <- smallvis:::zufft_tsne_sums(1, 1L, TRUE, tree)
engines <- list(fft = fft, tree = tree)
scales <- seq(1, 4, by = .1)

measure <- function(scale) {
  y <- scale * base
  grid <- smallvis:::fft_sne_grid(y, 1)
  side <- grid$side
  stopifnot(all(side == vapply(2 * grid$nodes, zufft::fft_next_len,
                              numeric(1), real = TRUE)))
  # Identify the hybrid's actual result independently of the grid-size rule.
  warmed <- lapply(engines, function(f) f(y))
  selected <- hybrid(y)
  matches <- vapply(warmed, identical, logical(1), y = selected)
  stopifnot(sum(matches) == 1)
  choice <- names(engines)[matches]
  stopifnot(choice == if (prod(side) <= min(14 * n, 4e6)) "fft" else "tree")

  times <- matrix(0, 2, 7)
  for (trial in seq_len(ncol(times))) {
    for (j in sample.int(length(engines))) {
      start <- Sys.time()
      invisible(engines[[j]](y))
      times[j, trial] <- as.numeric(difftime(Sys.time(), start, units = "secs"))
    }
  }
  ms <- apply(times, 1, median) * 1000
  data.frame(scale, fft = ms[1], tree = ms[2], nx = side[1], ny = side[2],
             choice = choice, row.names = NULL)
}
rows <- do.call(rbind, lapply(scales, measure))
stopifnot(identical(rle(rows$choice)$values, c("fft", "tree")))
data <- list(n = n, samples = rows,
             versions = c(smallvis = as.character(packageVersion("smallvis")),
                          zufft = as.character(packageVersion("zufft"))))
cat("window.CROSSOVER = ", toJSON(data, auto_unbox = TRUE, digits = 4),
    ";\n", file = "study/crossover-data.js", sep = "")

# The closed card shows the very same timing curves as the experiment.
x <- 9 + 191 * (rows$scale - min(scales)) / diff(range(scales))
maximum <- max(rows$fft, rows$tree)
line <- function(values, color, label, dashed = FALSE) {
  y <- 85 - 68 * values / maximum
  paste0('<polyline points="', paste(sprintf("%.1f,%.1f", x, y), collapse = " "),
         '" fill="none" stroke="', color, '" stroke-width="2.5"',
         if (dashed) ' stroke-dasharray="5 3"', '/>',
         '<text x="207" y="', round(tail(y, 1) + 4), '" fill="', color, '">',
         label, '</text>')
}
writeLines(c(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 286 104">',
  '<g font-family="system-ui,sans-serif" font-size="12" font-weight="600">',
  '<path d="M9 7V85H200" fill="none" stroke="#b6c5b7"/>',
  line(rows$fft, "#155e65", "FFT"),
  line(rows$tree, "#934021", "Mutual tree", TRUE),
  '<g fill="#475d55"><text x="9" y="101">1×</text>',
  '<text x="200" y="101" text-anchor="end">4×</text></g></g></svg>'
), "images/crossover.svg")
print(rows)
