I wrote [uwot], the R package [Seurat] uses by default to make UMAP plots.

### [My homepage — experiments, software, and writing][homepage]

The little orange dot in the last panel contains 5,000 points. So does the blue cloud beside it.
In the original data the blue group has ten times the radius of the orange one.
[Change the density scale][density] to see when the plot starts to exaggerate that difference.

<a href="https://jlmelville.github.io/#density">
  <picture>
    <source media="(max-width: 700px)" srcset="images/leopold-spread-mobile.png">
    <img src="images/leopold-spread.png"
      alt="Two groups of 5,000 points. The blue group's radius is ten times the orange group's
      in the input data. In two dimensions the ratio is 1.0 with UMAP, 9.7 at LEOPOLD density
      scale 0.5, and 66.9 at scale 1.">
  </picture>
</a>

Here's the [R code that made the figure][source]. If you prefer points you can read,
[pick a Jane Austen passage and see which five passages end up closest to it][austen].

[uwot]: https://github.com/jlmelville/uwot
[Seurat]: https://satijalab.org/seurat/reference/runumap
[homepage]: https://jlmelville.github.io/
[density]: https://jlmelville.github.io/#density
[source]: https://github.com/jlmelville/jlmelville.github.io/blob/main/tools/build-leopold.R
[austen]: https://jlmelville.github.io/#austen
