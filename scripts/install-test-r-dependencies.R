# Pin the GitHub release source until addCases is available from CRAN.
admisc_source <- paste0(
    "https://github.com/dusadrian/admisc/archive/",
    "617ea614521a316553a74a02eb00deb7e43490b6.tar.gz"
)
install.packages(admisc_source, repos = NULL, type = "source")

if (packageVersion("admisc") != "0.41.1" ||
    !is.element("addCases", getNamespaceExports("admisc"))) {
    stop("The pinned admisc 0.41.1 package must export addCases.")
}

packages <- commandArgs(trailingOnly = TRUE)
if (length(packages)) {
    install.packages(packages, repos = "https://cloud.r-project.org")
}
