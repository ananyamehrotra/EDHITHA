class VideoFrameExtractor {
  constructor() {
      this.videoFile = null;
      this.extractedFrames = [];
      this.currentFrameIndex = 0;
      this.isPlaying = false;
      this.playInterval = null;
      
      this.initializeElements();
      this.setupEventListeners();
      this.setupDragAndDrop();
  }

  initializeElements() {
      this.uploadBox = document.getElementById('upload-box');
      this.fileInput = document.getElementById('video-file');
      this.fileInfo = document.getElementById('file-info');
      this.frameContainer = document.getElementById('frame-container');
      this.frameCounter = document.getElementById('frame-counter');
      this.progressBar = document.getElementById('progress');
      this.playBtn = document.getElementById('play-btn');
      this.pauseBtn = document.getElementById('pause-btn');
      this.skipBtn = document.getElementById('skip-btn');
      this.exportBtn = document.getElementById('export-btn');
  }

  setupEventListeners() {
      this.fileInput.addEventListener('change', () => this.handleFileSelect());
      this.playBtn.addEventListener('click', () => this.playFrames());
      this.pauseBtn.addEventListener('click', () => this.pauseFrames());
      this.skipBtn.addEventListener('click', () => this.skipFrame());
      this.exportBtn.addEventListener('click', () => this.exportFrames());
  }

  setupDragAndDrop() {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
          this.uploadBox.addEventListener(eventName, (e) => {
              e.preventDefault();
              e.stopPropagation();
          });
      });

      this.uploadBox.addEventListener('dragenter', () => {
          this.uploadBox.style.borderColor = 'var(--primary-color)';
          this.uploadBox.style.backgroundColor = '#f0f7f0';
      });

      this.uploadBox.addEventListener('dragleave', () => {
          this.uploadBox.style.borderColor = '#ccc';
          this.uploadBox.style.backgroundColor = 'var(--surface-color)';
      });

      this.uploadBox.addEventListener('drop', (e) => {
          const file = e.dataTransfer.files[0];
          if (file && file.type.startsWith('video/')) {
              this.fileInput.files = e.dataTransfer.files;
              this.handleFileSelect();
          } else {
              this.showError('Please drop a valid video file.');
          }
          this.uploadBox.style.borderColor = '#ccc';
          this.uploadBox.style.backgroundColor = 'var(--surface-color)';
      });
  }

  handleFileSelect() {
      const file = this.fileInput.files[0];
      if (file && file.type.startsWith('video/')) {
          this.videoFile = file;
          this.fileInfo.textContent = `Selected: ${file.name}`;
          this.uploadVideo(file);
      } else {
          this.showError('Please select a valid video file.');
      }
  }

  async uploadVideo(file) {
      try {
          const formData = new FormData();
          formData.append('video', file);
          
          // Show loading state
          this.frameContainer.innerHTML = '<div class="loading">Processing video...</div>';
          
          const response = await fetch('/upload', {
              method: 'POST',
              body: formData
          });
          
          if (!response.ok) throw new Error('Upload failed');
          
          const data = await response.json();
          this.extractedFrames = data.frames;
          this.displayFrames();
          this.updateFrameCounter();
          
      } catch (error) {
          this.showError('Error uploading video: ' + error.message);
      }
  }

  displayFrames() {
      this.frameContainer.innerHTML = '';
      this.extractedFrames.forEach((frame, index) => {
          const img = document.createElement('img');
          img.src = frame;
          img.alt = `Frame ${index + 1}`;
          img.loading = 'lazy';
          this.frameContainer.appendChild(img);
      });
  }

  updateFrameCounter() {
      this.frameCounter.textContent = `${this.extractedFrames.length} frames`;
  }

  updateProgress() {
      const progress = (this.currentFrameIndex / this.extractedFrames.length) * 100;
      this.progressBar.style.width = `${progress}%`;
  }

  playFrames() {
      if (!this.extractedFrames.length) return;
      
      this.isPlaying = true;
      this.playBtn.disabled = true;
      this.pauseBtn.disabled = false;
      
      if (this.currentFrameIndex >= this.extractedFrames.length) {
          this.currentFrameIndex = 0;
      }
      
      this.playInterval = setInterval(() => {
          if (this.currentFrameIndex < this.extractedFrames.length) {
              this.updateProgress();
              this.currentFrameIndex++;
              this.scrollToCurrentFrame();
          } else {
              this.pauseFrames();
          }
      }, 200);
  }

  pauseFrames() {
      this.isPlaying = false;
      this.playBtn.disabled = false;
      this.pauseBtn.disabled = true;
      clearInterval(this.playInterval);
  }

  skipFrame() {
      if (!this.extractedFrames.length) return;
      
      if (this.currentFrameIndex < this.extractedFrames.length - 1) {
          this.currentFrameIndex++;
          this.updateProgress();
          this.scrollToCurrentFrame();
      }
  }

  scrollToCurrentFrame() {
      const frames = this.frameContainer.getElementsByTagName('img');
      if (frames[this.currentFrameIndex]) {
          frames[this.currentFrameIndex].scrollIntoView({
              behavior: 'smooth',
              block: 'nearest'
          });
      }
  }

  async exportFrames() {
      if (!this.extractedFrames.length) {
          this.showError('No frames to export');
          return;
      }

      try {
          const response = await fetch('/export', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ frames: this.extractedFrames })
          });

          if (!response.ok) throw new Error('Export failed');

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'extracted-frames.zip';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
      } catch (error) {
        this.showError('Error exporting frames: ' + error.message);
      }
  }

  showError(message) {
      // Create and show error notification
      const notification = document.createElement('div');
      notification.className = 'error-notification';
      notification.innerHTML = `
          <i class="fas fa-exclamation-circle"></i>
          <span>${message}</span>
      `;
      document.body.appendChild(notification);

      // Remove notification after 3 seconds
      setTimeout(() => {
          notification.classList.add('fade-out');
          setTimeout(() => {
              document.body.removeChild(notification);
          }, 300);
      }, 3000);
  }

  reset() {
      this.videoFile = null;
      this.extractedFrames = [];
      this.currentFrameIndex = 0;
      this.isPlaying = false;
      clearInterval(this.playInterval);
      this.frameContainer.innerHTML = '';
      this.fileInfo.textContent = 'Supported formats: MP4, WebM, MOV';
      this.progressBar.style.width = '0%';
      this.updateFrameCounter();
      this.playBtn.disabled = false;
      this.pauseBtn.disabled = true;
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  const app = new VideoFrameExtractor();
});

// Add some CSS for the error notification
const style = document.createElement('style');
style.textContent = `
  .error-notification {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #ff4444;
      color: white;
      padding: 12px 24px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      animation: slideIn 0.3s ease;
      z-index: 1000;
  }

  .error-notification.fade-out {
      animation: slideOut 0.3s ease;
  }

  @keyframes slideIn {
      from {
          transform: translateX(100%);
          opacity: 0;
      }
      to {
          transform: translateX(0);
          opacity: 1;
      }
  }

  @keyframes slideOut {
      from {
          transform: translateX(0);
          opacity: 1;
      }
      to {
          transform: translateX(100%);
          opacity: 0;
      }
  }

  .loading {
      text-align: center;
      padding: 40px;
      color: #666;
      font-size: 18px;
  }

  .loading::after {
      content: '';
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid #666;
      border-radius: 50%;
      border-top-color: transparent;
      animation: spin 1s linear infinite;
      margin-left: 10px;
      vertical-align: middle;
  }

  @keyframes spin {
      to {
          transform: rotate(360deg);
      }
  }
`;
document.head.appendChild(style);