// Utility function to extract video ID from YouTube URL
function getYouTubeVideoId(url) {
  const urlObj = new URL(url);
  if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
    return urlObj.searchParams.get('v');
  }
  if (urlObj.hostname === 'youtu.be') {
    return urlObj.pathname.slice(1);
  }
  return null;
}

// Function to get video details from YouTube
async function getVideoDetails(videoId) {
  try {
    const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    const data = await response.json();
    return {
      title: data.title,
      videoId: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`
    };
  } catch (error) {
    console.error('Error fetching video details:', error);
    return null;
  }
}

// Function to save video to storage
async function saveVideo(videoDetails) {
  try {
    const result = await chrome.storage.sync.get('videos');
    const videos = result.videos || [];

    // Check if video already exists
    if (!videos.some(v => v.videoId === videoDetails.videoId)) {
      videos.push(videoDetails);
      await chrome.storage.sync.set({ videos });
      updateVideoList();
    }
  } catch (error) {
    console.error('Error saving video:', error);
  }
}

// Function to remove video from storage
async function removeVideo(videoId) {
  try {
    const result = await chrome.storage.sync.get('videos');
    const videos = result.videos || [];
    const updatedVideos = videos.filter(v => v.videoId !== videoId);
    await chrome.storage.sync.set({ videos: updatedVideos });
    updateVideoList();
  } catch (error) {
    console.error('Error removing video:', error);
  }
}

// Function to create video item element
function createVideoItem(video) {
  const li = document.createElement('li');
  li.className = 'video-item';

  li.innerHTML = `
    <div class="video-info">
      <p title='${video.title}' class="video-title">${video.title}</p>
    </div>
    <div class="button-group">
      <button class="action-button open" title="Open video">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      </button>
      <button class="action-button delete" title="Remove from list">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  `;

  // Add event listeners
  li.querySelector('.open').addEventListener('click', () => {
    chrome.tabs.create({ url: video.url });
  });

  li.querySelector('.delete').addEventListener('click', () => {
    removeVideo(video.videoId);
  });

  return li;
}

// Function to update video list in popup
async function updateVideoList() {
  const videoList = document.getElementById('videoList');
  const noVideos = document.getElementById('noVideos');

  try {
    const result = await chrome.storage.sync.get('videos');
    const videos = result.videos || [];

    videoList.innerHTML = '';

    if (videos.length === 0) {
      noVideos.classList.remove('hidden');
      videoList.classList.add('hidden');
    } else {
      noVideos.classList.add('hidden');
      videoList.classList.remove('hidden');
      videos.forEach(video => {
        videoList.appendChild(createVideoItem(video));
      });
    }
  } catch (error) {
    console.error('Error updating video list:', error);
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  // Update video list on popup open
  updateVideoList();

  // Add save button click handler
  document.getElementById('saveVideo').addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const videoId = getYouTubeVideoId(tab.url);

      if (videoId) {
        const videoDetails = await getVideoDetails(videoId);
        if (videoDetails) {
          await saveVideo(videoDetails);
        }
      }
    } catch (error) {
      console.error('Error saving current video:', error);
    }
  });
});