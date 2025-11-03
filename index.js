const videoress = document.getElementById("video-ress");
const form = document.getElementById("media-search-form");
const queryinput = document.getElementById("query-input");
const media_select = document.getElementById("media-select");
const Video_limit = 9;

let currentpage = 1;
let currentquery = "";
let currentmediatype = "";
let loadmorebutton = null;
const resultsperpage = 12;

function loading() {
  videoress.innerHTML = `
        <div class="loading-container">
            <div class="spinner"></div>
            <p style="color: gray;"> Loading ${media_select.value}... Please wait.</p>
        </div>
    `;
  if (loadmorebutton) {
    loadmorebutton.remove();
    loadmorebutton = null;
  }
}

async function sendRequest(query, media_type, isnewsearch = true) {
  if (isnewsearch) {
    loading();
    currentquery = query;
    currentmediatype = media_type;
    currentpage = 1;
    // videoress.innerHTML = "";
    if (loadmorebutton) {
      loadmorebutton.remove();
      loadmorebutton = null;
    }
  }
  let pageParam = "";
  let limit = 0;
  if (media_type === "image") {
    pageParam = `&page=${currentpage}`;
    limit = resultsperpage;
  } else {
    limit = Video_limit;
  }
  if (!query) {
    query = "stars";
    currentquery = "stars";
  }
  const url = `https://images-api.nasa.gov/search?q=${query}&media_type=${media_type}${pageParam}`;
  try {
    const res = await fetch(url);
    // console.log(res)
    if (!res.ok) {
      throw new Error(`Error status is : ${res.status}`);
    }
    const data = await res.json();
    const mediaItems = data.collection.items;
    // videoress.innerHTML = "";
    if (isnewsearch && mediaItems && mediaItems.length > 0) {
      videoress.innerHTML = "";
    }
    if (isnewsearch && (!mediaItems || mediaItems.length === 0)) {
      videoress.innerHTML = `<p>No results found for your query.</p>`;
      return;
    }
    if (mediaItems && mediaItems.length > 0) {
      // const limited_items = mediaItems.slice(0, Video_limit);
      const itemsToShow = media_type === "video" ? Video_limit : resultsperpage;
      const itemstoDisplay = mediaItems.slice(0, itemsToShow);
      const fetchFunction =
        media_type === "video" ? fetchVideoUrls : fetchImageUrls;
      // console.log(limited_videos)
      const tasks = itemstoDisplay
        .map((item) => {
          const itemurl = item.href;
          const title = item.data[0].title;
          const type = item.data[0].media_type;
          const thumbnail_url = item.links?.[0]?.href || null;
          // console.log(item.links)
          if (type === media_type) {
            return fetchFunction(itemurl, title, thumbnail_url);
          }
          return null;
        })
        .filter((promise) => promise !== null);
      // console.log(videos)

      await Promise.allSettled(tasks);
      if (media_type === "image") {
        const totalHits = data.collection.metadata.total_hits;
        const itemsLoaded = currentpage * resultsperpage;

        if (itemsLoaded < totalHits) {
          createLoadMoreButton();
        } else if (loadmorebutton) {
          loadmorebutton.remove();
          loadmorebutton = null;
        }
      }
    } else {
      console.log("No video results found for the query.");
      videoress.innerHTML = `<p>No video results found for the query.</p>`;
    }
  } catch (err) {
    console.log(`Search failed : ${err}`);
    if (isnewsearch) {
      videoress.innerHTML = `<p style="color:red;">Search failed: ${err.message}</p>`;
    }
  }
}
function createLoadMoreButton() {
  if (!loadmorebutton) {
    loadmorebutton = document.createElement("button");
    loadmorebutton.textContent = "Load More Images";
    loadmorebutton.id = "load-more";
    loadmorebutton.addEventListener("click", handleLoadMore);
    videoress.parentNode.insertBefore(loadmorebutton, videoress.nextSibling);
  }
}

function handleLoadMore() {
  if (loadmorebutton) {
    loadmorebutton.disabled = true;
    loadmorebutton.textContent = "Loading...";
  }

  currentpage++;
  sendRequest(currentquery, currentmediatype, false).finally(() => {
    if (loadmorebutton) {
      loadmorebutton.disabled = false;
      loadmorebutton.textContent = "Load more Images";
    }
  });
}
sendRequest(queryinput.value || "stars", media_select.value || "video");

function createVideoContainer(videourl, title, thumbnail_url) {
  const videocontainer = document.createElement("div");
  videocontainer.classList.add("media-container");
  const titletext = document.createElement("h2");
  titletext.textContent = title;

  const thumbnailImage = document.createElement("img");
  thumbnailImage.src = thumbnail_url || "placeholder.jpg";
  thumbnailImage.alt = title;
  thumbnailImage.classList.add("video-thumbnail");

  const video = document.createElement("video");
  video.setAttribute("controls", "");
  // video.setAttribute("autoplay", "");
  video.setAttribute("preload", "metadata");
  video.setAttribute("playsinline", "");
  video.setAttribute("loading", "lazy");
  video.setAttribute("width", "100%");
  const source = document.createElement("source");
  source.src = videourl;
  source.type = "video/mp4";
  video.appendChild(source);
  const showVideo = () => {
    if (videocontainer.contains(thumbnailImage)) {
      videocontainer.replaceChild(video, thumbnailImage);
      video.play().catch((e) => console.log("Autoplay Prevented : ", e));
    }
  };

  const showThumbnail=()=>{
    if (videocontainer.contains(video)){
      video.pause();
      // video.currentTime=0; 
      videocontainer.replaceChild(thumbnailImage,video)
    }
  }

  thumbnailImage.addEventListener("mouseenter",showVideo);
  thumbnailImage.addEventListener("click",showVideo);
  videocontainer.addEventListener("mouseenter",showVideo)
  videocontainer.addEventListener("mouseleave",showThumbnail)
  videocontainer.appendChild(titletext);
  videocontainer.appendChild(thumbnailImage);
  videoress.appendChild(videocontainer);
}

async function fetchVideoUrls(videourl, title, thumbnail_url) {
  try {
    const res = await fetch(videourl);
    if (!res.ok) {
      throw new Error(`Error status is : ${res.status}`);
    }
    const links = await res.json();
    // console.log(links)
    const videolink =
      links.find((link) => link.includes("small.mp4")) ||
      links.find((link) => link.includes("medium.mp4")) ||
      links.find((link) => link.endsWith(".mp4"));
    if (videolink) {
      //   console.log(videolink);
      createVideoContainer(videolink, title, thumbnail_url);
    } else {
      console.log(`No video urls found`);
      console.log(`No high-quality MP4 link found for: ${title}`);
    }
  } catch (err) {
    console.log(`Videos fetching failed for ${title}: ${err.message}`);
  }
}

function createImageContainer(imageurl, title) {
  const imagecontainer = document.createElement("div");
  imagecontainer.classList.add("media-container");
  const titletext = document.createElement("h2");
  titletext.textContent = title;
  const image = document.createElement("img");
  image.src = imageurl;
  image.alt = title;
  image.setAttribute("loading", "lazy");
  imagecontainer.appendChild(titletext);
  imagecontainer.appendChild(image);
  videoress.appendChild(imagecontainer);
}

async function fetchImageUrls(itemurl, title) {
  try {
    const res = await fetch(itemurl);
    if (!res.ok) {
      throw new Error(`Error status is : ${res.status}`);
    }
    const links = await res.json();
    const imagelink = links.find((link) => {
      return (
        link.includes("orig.jpg") ||
        link.includes("medium.jpg") ||
        link.endsWith(".jpg")
      );
    });
    if (imagelink) {
      createImageContainer(imagelink, title);
    } else {
      console.log(`No image urls found`);
      console.log(`No high-quality image link found for: ${title}`);
    }
  } catch (err) {
    console.log(`Images fetching failed for ${title}: ${err.message}`);
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const query = queryinput.value.trim();

  if (query === "") {
    videoress.innerHTML = `<p style="color: red; text-align: center;place-content: center;">Please enter a search query before clicking Search.</p>`;
    queryinput.focus();

    if (loadmorebutton) {
      loadmorebutton.remove();
      loadmorebutton = null;
    }
    return;
  }

  sendRequest(query, media_select.value, true);
});
