# From the repository root: Rscript study/forces.R
library(smallvis)
library(zufft)
library(jsonlite)
set.seed(27)
n <- 4200L
group <- sample.int(4, n, replace = TRUE, prob = c(.3, .25, .25, .2))
cx <- c(-7, 4, -2, 8)[group]
cy <- c(-1, -5, 6, 5)[group]
a <- rnorm(n)
b <- rnorm(n)
Y <- cbind(cx + a * c(2.5, 3.8, 1.7, 2)[group],
           cy + a * c(.9, -.7, 1.7, .2)[group] + b * c(1.4, 1.4, 2, 2.1)[group])
empty <- integer(n + 1L)
tree <- function(theta) {
  force(theta)
  function() -smallvis:::bh_tsne_gradient_cpp(integer(), empty, numeric(), Y,
                                                theta = theta, n_threads = 1L)
}
fft <- function(interval) {
  sums <- smallvis:::zufft_tsne_sums(interval, 1L, TRUE)
  function() {
    field <- sums(Y)
    field$force / field$Z
  }
}
engines <- list(exact = tree(0), bh3 = tree(.3), bh5 = tree(.5), bh8 = tree(.8),
                fft025 = fft(.25), fft05 = fft(.5), fft1 = fft(1))
fields <- lapply(engines, function(f) f())
# Check the exact engine against a direct Student-t sum on the entire layout.
direct <- matrix(0, n, 2)
Z <- 0
for (i in seq_len(n)) {
  d <- matrix(Y[i, ], n, 2, byrow = TRUE) - Y
  q <- 1 / (1 + rowSums(d^2))
  q[i] <- 0
  Z <- Z + sum(q)
  direct[i, ] <- colSums(d * q^2)
}
stopifnot(max(abs(direct / Z - fields$exact)) < 1e-12)
times <- matrix(NA_real_, length(engines), 7)
for (i in seq_len(ncol(times))) {
  for (j in sample.int(length(engines))) {
    t <- Sys.time()
    invisible(engines[[j]]())
    times[j, i] <- as.numeric(difftime(Sys.time(), t, units = "secs")) * 1000
  }
}
norm <- function(M) sqrt(sum(M^2))
data <- list(xy = Y, fields = fields,
             ms = as.list(setNames(apply(times, 1, median), names(engines))),
             error = lapply(fields, function(M) 100 * norm(M-fields$exact)/norm(fields$exact)),
             details = list(n = n, R = getRversion() |> as.character(),
                            smallvis = as.character(packageVersion("smallvis")),
                            zufft = as.character(packageVersion("zufft"))))
# Ship normalized coordinates and full-precision vectors as static data.
cat("window.FORCES=", toJSON(data, auto_unbox = TRUE, digits = NA), ";", sep = "",
    file = "study/forces-data.js")
print(data$ms)
print(data$error)
