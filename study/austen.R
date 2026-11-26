# Run from the repository root with the packages used in the article.
library(Matrix)
library(tm)
library(janeaustenr)
library(jsonlite)
books <- austen_books()
novels <- levels(books$book)
chunks <- lapply(novels, function(book) {
  lines <- books$text[books$book == book]
  unname(vapply(split(lines, ceiling(seq_along(lines) / 10)), paste,
                collapse = " ", FUN.VALUE = ""))
})
text <- unlist(chunks, use.names = FALSE)
book <- rep(seq_along(novels) - 1L, lengths(chunks))
passage <- sequence(lengths(chunks))
corpus <- Corpus(VectorSource(text))
for (f in list(content_transformer(tolower), removePunctuation, removeNumbers,
               function(x) removeWords(x, stopwords("english")), stripWhitespace)) {
  corpus <- tm_map(corpus, f)
}
tf <- weightTfIdf(DocumentTermMatrix(corpus))
X <- sparseMatrix(i = tf$i, j = tf$j, x = tf$v, dims = dim(tf))
mass <- Matrix::rowSums(X)
stopifnot(all(mass > 0))
X <- Diagonal(x = 1 / mass) %*% X
nn <- rnndescent::brute_force_knn(X, k = 15, metric = "jensenshannon",
                                  n_threads = 6, verbose = TRUE)
set.seed(42)
xy <- uwot::umap(NULL, nn_method = nn, batch = TRUE, n_epochs = 1000,
                 n_sgd_threads = 6, init_sdev = "range", dens_scale = 0.5,
                 verbose = TRUE)
plane <- rnndescent::brute_force_knn(xy, k = 6, metric = "euclidean",
                                     n_threads = 6)
five <- function(mat) {
  t(vapply(seq_len(nrow(mat)), function(i) as.integer(head(mat[i, mat[i, ] != i], 5L)) - 1L,
           integer(5)))
}
data <- list(books = novels, book = book, passage = passage,
             text = trimws(gsub("[[:space:]]+", " ", text)), xy = unname(xy),
             words = five(nn$idx), map = five(plane$idx))
cat("window.AUSTEN=", toJSON(data, digits = 7), ";", sep = "",
    file = "study/austen-data.js")
