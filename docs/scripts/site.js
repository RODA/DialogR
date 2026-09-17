const search = document.getElementById("manual-search");

const screenshotViewer = document.getElementById("screenshot-viewer");

if (screenshotViewer && typeof screenshotViewer.showModal === "function") {
    const enlarged = document.getElementById("enlarged-screenshot");
    let opener = null;

    document.querySelectorAll("[data-enlarge]").forEach(function(link) {
        link.addEventListener("click", function(event) {
            event.preventDefault();
            opener = link;
            const figure = link.closest("figure");
            enlarged.src = link.href;
            enlarged.alt = figure.querySelector("img").alt;
            document.getElementById("screenshot-title").textContent = figure.querySelector("figcaption span").textContent;
            screenshotViewer.showModal();
        });
    });

    document.getElementById("close-screenshot").addEventListener("click", function() {
        screenshotViewer.close();
    });

    screenshotViewer.addEventListener("close", function() {
        opener?.focus();
    });
}

if (search) {
    const chapters = Array.from(document.querySelectorAll("[data-chapter]"));
    const links = Array.from(document.querySelectorAll("[data-chapter-link]"));
    const status = document.getElementById("search-status");
    document.getElementById("search-controls").hidden = false;

    const filterChapters = function() {
        const query = search.value.trim().toLowerCase();
        let count = 0;

        for (const chapter of chapters) {
            chapter.hidden = !chapter.textContent.toLowerCase().includes(query);
            if (!chapter.hidden) {
                count += 1;
            }
        }

        for (const link of links) {
            link.hidden = document.getElementById(link.dataset.chapterLink).hidden;
        }

        status.textContent = query
            ? count + " matching topics" + (count === 0 ? ". Try a different term, or clear the search." : ". Clear the search to see all topics.")
            : "";
    };

    search.addEventListener("input", filterChapters);

    const revealChapter = function() {
        search.value = "";
        filterChapters();
        const target = document.getElementById(location.hash.slice(1));
        if (target) {
            target.scrollIntoView();
        }
    };

    window.addEventListener("hashchange", revealChapter);
    document.querySelectorAll('a[href^="#"]').forEach(function(link) {
        link.addEventListener("click", function() {
            search.value = "";
            filterChapters();
        });
    });
}
