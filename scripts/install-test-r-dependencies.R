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
if (is.element("statistics", packages)) {
    install.packages("statistics", repos = c(
        "https://dusadrian.r-universe.dev",
        "https://cloud.r-project.org"
    ))
    packages <- setdiff(packages, "statistics")

    if (!requireNamespace("statistics", quietly = TRUE) ||
        packageVersion("statistics") <= "0.14") {
        stop("The packaged menu tests require statistics newer than 0.14.")
    }
}
if (length(packages)) {
    install.packages(packages, repos = "https://cloud.r-project.org")
}

missing <- packages[!vapply(packages, requireNamespace, logical(1), quietly = TRUE)]
if (length(missing)) {
    stop("Test dependencies were not installed: ", paste(missing, collapse = ", "))
}
