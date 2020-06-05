$(document).ready(function () {
    let artists;
    let completeArtistsArray = [];
    let albums;
    let completeAlbumsArray = [];
    let beingSearched;
    let allSelected = false;

    // records shown at a time depending on client width
    const recordsToShow = (window.innerWidth > 1000) ? 6 : 4;

    makeFetchApiCall("http://localhost:9999/artists", "artists");
    makeFetchApiCall("http://localhost:9999/albums", "albums");

    function makeFetchApiCall(url, type, loadMore = false, typeSearch = false, loadShrinkType = false) {
        fetch(url, { mode: 'cors' })
            .then((res) => res.ok ? res.json() : console.log("Error in first call" + res))
            .then((response) => {
                if (response.error) console.log("error retrieving information");
                if (!loadMore) {
                    if (type == "search") {
                        const objectFromAPI = (typeSearch == "albums") ? response.data.albums.items : JSON.parse(response.data)["artists"]["items"];
                        deconstructResult(objectFromAPI, typeSearch, true);
                    } else {
                        // Initial request
                        const objectFromAPI = JSON.parse(response.data);
                        deconstructResult(objectFromAPI, type);
                    }
                } else {
                    // Load more artists requests
                    const objectFromAPI = response.data.artists;
                    const objectFromZeroToMax = objectFromAPI.slice(0, recordsToShow);
                    objectFromZeroToMax.forEach((object) => {
                        const domElement = document.getElementById("artists-images");
                        processRequest(type, domElement, object)
                    });
                    artists = objectFromAPI;
                    completeArtistsArray.filter((artist) => !artists.includes(artist.id));
                    completeArtistsArray
                }
                if (loadShrinkType) {
                    loadShrink(loadShrinkType, type);
                }
            })
            .catch((error) => console.log("error: " + error));
    }

    function deconstructResult(objectFromAPI, type, search = false) {
        const objectToUse = (search) ? objectFromAPI : objectFromAPI[type];

        // starts at a random position, if being searched, starts at zero
        const random = beingSearched? 0: Math.floor(Math.random() * (objectToUse.length - recordsToShow));
        // goes from random until the value specified above
        const objectFromRandomToMax = objectToUse.slice(random, (random + recordsToShow));

        // adds objects to the dom
        if (search) {
            document.getElementById(`${type}-images`).innerHTML = "";
            beingSearched = true;
        }
        objectFromRandomToMax.forEach((object) => {
            const domElement = document.getElementById(type + "-images");
            processRequest(type, domElement, object, search)
        });

        // To be used in load more function
        const smallerArray = objectToUse.filter((objectFromAPI) => !objectFromRandomToMax.includes(objectFromAPI));

        if (type == "albums") {
            albums = smallerArray;
            completeAlbumsArray = objectToUse;
            getAlbumGenres();
        } else if (type == "artists") {
            artists = smallerArray;
            completeArtistsArray = objectToUse;
        }
    }

    function getAlbumGenres() {
        // Because spotify doesn't return the genres of an album, cross album with artists to had album's genre
        completeAlbumsArray.forEach((album) => {
            for (let artist of completeArtistsArray) {
                if (album.artists[0]["name"] == artist["name"]) {
                    // Some artists don't have genres
                    if (!artist.genres[0]) {
                        album["album_genres"] = "metal";
                    } else if (artist.genres[0].includes("rock")) {
                        album["album_genres"] = "psych";
                    } else {
                        // Even if the artists genre is dark jazz, it is attributed metal genre
                        album["album_genres"] = "metal";
                    }
                    break;
                }
            }
        });
    }

    /* Load More */
    document.getElementById("artists-load-more").addEventListener("click", () => loadMoreObjects("artists-more"));
    document.getElementById("albums-load-more").addEventListener("click", () => loadMoreObjects("albums-more"));

    function loadMoreObjects(type) {
        event.preventDefault();
        if (type == "albums-more" && document.getElementById("albums-load-more").className == "warning") return;
        const domElement = (type == "artists-more") ? document.getElementById("artists-images") : document.getElementById("albums-images");
        processRequest(type, domElement);
    }

    function processRequest(type, domElement, object = false, search = false) {
        if (search) {
            (type == "artists") ? printToDom(object, domElement, true, true, true) : printToDom(object, domElement, true, false);
        } else {
            if (type == "albums") {
                printToDom(object, domElement, false, object.popularity);
            } else if (type == "artists") {
                printToDom(object, domElement, false, object.popularity, true);
            } else if (type == "artists-more") {
                if (allSelected) artists = [];
                // if list of artists in server was seen, loads related artists, according to a random artist in server
                if (artists.length == 0) {
                    const random = Math.floor(Math.random() * (completeArtistsArray.length - recordsToShow));
                    makeFetchApiCall("http://localhost:9999//artist-related?id=" + completeArtistsArray[random].id, "artists", "load-more")
                    document.getElementById("artists-load-more").text = "More artists from Spotify";
                } else {
                    // To remove initial print duplication on new artists => artists-more
                    (artists.length == 20) ? artists.splice(0, recordsToShow) : null;
                    removeFromList(artists, domElement, true);
                }
            } else if (type == "albums-more") {
                removeFromList(albums, domElement, false);
                if (albums.length == 0) {
                    // When there are no more albums to show, displays tooltip and changes to warning style
                    setTimeout(() => {
                        const domElement = document.getElementById("albums-load-more");
                        domElement.className = "warning";
                        (beingSearched) ? domElement.setAttribute("data-error", "All related albums have been shown.") : null;
                    }, 500);
                }
            }
        }
    }

    function removeFromList(artistsOrAlbums, domElement, isArtist) {
        const objectFromZeroToMax = artistsOrAlbums.slice(0, (0 + recordsToShow));
        objectFromZeroToMax.forEach((object) => {
            printToDom(object, domElement, false, object.popularity, isArtist);
        });
        artistsOrAlbums.splice(0, recordsToShow);
    }

    function printToDom(object, domElement, removeWarning, popularity, artist = false) {
        // general
        const name = shorterName(object, "name");
        const externalUrl = compareExternalUrls(object);
        const popularityOrReleaseDate = (popularity && object.popularity) ? object.popularity + " Popularity" : object.releaseDate;
        const img = object.images[2] ? object.images[2].url : "./images/icons/placeholder.svg";

        let htmlToAdd =
            `<div class="zero-opacity">
            <a href="${externalUrl}" target="_blank">
                <img src="${img}" alt="${object.name}">
            </a>
            <p>${name}</p>`
        if (artist) {
            const genre = shorterName(object, "genre");
            htmlToAdd +=
                `<p class="capitalize">${genre}</p>
                <p>${object.followers.total} Followers</p>`;
        } else {
            const nameOfAlbumArtist = shorterName(object, "albumArtistName");
            htmlToAdd += `<p>${nameOfAlbumArtist}</p>`
        }
        htmlToAdd += `<p>${popularityOrReleaseDate} </p></div>`;
        domElement.innerHTML += htmlToAdd;
        setTimeout(() => { $(".zero-opacity").css("opacity", 1) }, 100);
        removeWarning ? document.getElementById("albums-load-more").classList.remove("warning") : null;
    }

    function shorterName(object, type) {
        if (type == "genre") {
            // Some genres are empty
            return (object.genres.length == 0) ? "No genre attributed" : (object.genres.slice(0, 1)[0].length > 14) ? object.genres.slice(0, 1)[0].slice(0, 16) + " ..." : object.genres.slice(0, 1)[0];
        } else if (type == "name") {
            return (object.name.length > 19) ? object.name.slice(0, 20) + " ..." : object.name;
        } else if (type == "albumArtistName") {
            if (object.artists) {
                return (object.artists[0].name.length > 19) ? object.artists[0].name.slice(0, 20) + " ..." : object.artists[0].name;
            } else {
                return (object.name.length > 19) ? object.name.slice(0, 20) + " ..." : object.name;
            }
        }
    }

    /* Albums and Artists load or Shrink */

    document.getElementById("all-albums-icon").addEventListener("click", () => loadShrink("all", "albums"));
    document.getElementById("psych-albums-icon").addEventListener("click", () => loadShrink("psych", "albums"));
    document.getElementById("metal-albums-icon").addEventListener("click", () => loadShrink("metal", "albums"));

    document.getElementById("all-artists-icon").addEventListener("click", () => loadShrink("all", "artists"));
    document.getElementById("psych-artists-icon").addEventListener("click", () => loadShrink("psych", "artists"));
    document.getElementById("metal-artists-icon").addEventListener("click", () => loadShrink("metal", "artists"));

    // loadShrink("metal", albums) || loadShrink("all", artists)
    function loadShrink(typeOfOperation, typeOfObject) {
        document.getElementById(typeOfObject + "-images").innerHTML = "";
        if (beingSearched) {
            beingSearched = false;
            // If searching and switch to a category
            makeFetchApiCall("http://localhost:9999/" + typeOfObject, typeOfObject, false, false, typeOfOperation);
            document.getElementById(typeOfObject + "-load-more").classList.remove("warning");
        } else {
            const elementToIterate = (typeOfObject == "albums") ? completeAlbumsArray : completeArtistsArray;
            if (typeOfOperation == "all") {
                // If operation is from icon All / Shuffle (first icon)
                if (document.getElementById("all-" + typeOfObject + "-icon").className == "fas fa-border-all fa-2x") {
                    // All
                    elementToIterate.forEach((albumOrArtist) => {
                        processRequest(typeOfObject, document.getElementById(typeOfObject + "-images"), albumOrArtist, false);
                    });
                    setTimeout(() => {
                        document.getElementById("all-" + typeOfObject + "-icon").className = "fas fa-random fa-2x";
                        document.getElementById("all-" + typeOfObject + "-icon").setAttribute("data-type", "Shuffle " + typeOfObject);
                        document.getElementById(typeOfObject + "-load-more").className = "warning", 500;
                        if (typeOfObject == "artists") {
                            document.getElementById(typeOfObject + "-load-more").text = `More ${typeOfObject} from Spotify`;
                        } 
                    }, 300);
                    allSelected = true;
                } else {
                    // Shuffle
                    makeFetchApiCall("http://localhost:9999/" + typeOfObject, typeOfObject);
                    document.getElementById(typeOfObject + "-load-more").classList.remove("warning");
                    setTimeout(() => {
                        document.getElementById("all-" + typeOfObject + "-icon").className = "fas fa-border-all fa-2x";
                        document.getElementById("all-" + typeOfObject + "-icon").setAttribute("data-type", "All " + typeOfObject);
                        document.getElementById(typeOfObject + "-load-more").text = `More ${typeOfObject}`;
                    }, 100);
                    allSelected = false;
                }
            } else {
                // If operation is from icon psych or icon metal, return only of a specific type
                elementToIterate.forEach((object) => {
                    if (object["type"] == "album") {
                        if (object["album_genres"] == typeOfOperation) {
                            processRequest("albums", document.getElementById("albums-images"), object, false);
                        }
                    } else {
                        if (typeOfOperation == "psych" && object["genres"][0] && object["genres"][0].includes("rock")) {
                            processRequest("artists", document.getElementById("artists-images"), object, false);
                        } else if (typeOfOperation == "metal" && !(object["genres"][0] && object["genres"][0].includes("rock"))) {
                            processRequest("artists", document.getElementById("artists-images"), object, false);
                        }
                    }
                });

                document.getElementById(typeOfObject + "-load-more").className = "warning", 500;
            }
        }

        setTimeout(() => {
            $(".zero-opacity").css("opacity", 1);
        }, 200);
    }

    /* Search functionality */

    let timeout;
    $("#search-albums-input").on("input", function () {
        searchAlbumOrArtists("albums", this.value);
    });
    $("#search-artists-input").on("input", function () {
        searchAlbumOrArtists("artists", this.value);
    });

    function searchAlbumOrArtists(object, inputValue) {
        (timeout) ? clearTimeout(timeout) : null;

        const switchTo = document.getElementById(`search-${object}-icon`);
        switchTo.className = "fas fa-spinner fa-2x spinning";
        inputValue = sanitizeString(inputValue).replace(/ /g, "");
        timeout = setTimeout(function () {
            if (object == "albums") {
                const url = `http://localhost:9999/search?q=${inputValue}&type=album`;
                makeFetchApiCall(url, "search", false, object, false);
            } else {
                const url = `http://localhost:9999/search?q=${inputValue}&type=artist`;
                makeFetchApiCall(url, "search", false, object, false);
            }
            switchTo.className = "fas fa-search fa-2x";
        }, 2500)
    }

    function compareExternalUrls(object) {
        return (object.external_urls) ? object.external_urls.spotify : object.externalUrls.spotify;
    }

    /* Click events */
    document.getElementById("toggle").addEventListener("click", toggleNav);

    function toggleNav() {
        const domElement = document.getElementById("hero-nav");
        (domElement.firstElementChild.classList[0] == "transform-show") ? domElement.firstElementChild.className = "transform-hide" : domElement.firstElementChild.className = "transform-show";
    }

    document.getElementById("search-albums-icon").addEventListener("click", () => toggleSearch("search-albums-input"));
    document.getElementById("search-artists-icon").addEventListener("click", () => toggleSearch("search-artists-input"));

    function toggleSearch(element) {
        document.getElementById(element).className == "margin-on" ? document.getElementById(element).className = "margin-off" : document.getElementById(element).className = "margin-on";
    }

    /* Hero content */
    const lyricsAndArtist = [
        {
            "artist": "Pink Floyd",
            "content": "All you touch and all you see Is all your life will ever be",
            "song": "Breathe"
        },
        {
            "artist": "Dream Theater",
            "content": "We can learn from the past but those days are gone, we can hope for the future but there might not be one.",
            "song": "A change of seasons"
        },
        {
            "artist": "Om",
            "content": " And the phoenix rise triumphant, and walks onto the certitude ground, the soul's submergence ends",
            "song": "State of Non-Return"
        },
        {
            "artist": "The Eagles",
            "content": "How they dance in the courtyard, sweet summer sweat. Some dance to remember, some dance to forget",
            "song": "Hotel California"
        },
        {
            "artist": "April Rain",
            "content": "-It's important to do the wrong thing. / - Why? Oh, I see, to learn from your mistakes. / - No, to make them! To find out what's real, and what's not, to find out what you feel",
            "song": "One is glad to be of service (in memory of Robin Williams)"
        }
    ]

    const gallery = $("#quote-gallery");

    gallery.append(`
            <p>${lyricsAndArtist[0].content}</p>
            <p>${lyricsAndArtist[0].song}</p>
            <p>${lyricsAndArtist[0].artist}</p>`);

    let i = 0;
    setInterval(function () {
        i++;
        gallery.addClass('horizTranslate');

        setTimeout(function () {
            gallery.html(`
                <p>${lyricsAndArtist[i].content}</p>
                <p>${lyricsAndArtist[i].song}</p>
                <p>${lyricsAndArtist[i].artist}</p>`);
            gallery.removeClass('horizTranslate');
        }, 700);

        if (i == lyricsAndArtist.length) i = 0;
    }, 10000);

    // https://stackoverflow.com/questions/23187013/is-there-a-better-way-to-sanitize-input-with-javascript
    function sanitizeString(str) {
        str = str.replace(/[^a-z0-9áéíóúñü \.,_-]/gim, "");
        return str.trim();
    }
});