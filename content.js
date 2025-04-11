// Debug logging
console.log('Job Scraper content script loaded');

class JobTracker {
  constructor() {
    this.overlay = null;
    this.counter = 0;
    this.streak = 0;
    this.lastUpdated = null;
    this.initialize();
  }

  async initialize() {
    try {
      await this.createOverlay();
      this.setupEventListeners();
      // Show the overlay with animation
      setTimeout(() => {
        this.overlay.classList.add('visible');
      }, 100);
      // Load saved counter and streak values
      await this.loadCounter();
      await this.checkStreak();
    } catch (error) {
      console.error('Failed to initialize Job Tracker:', error);
    }
  }

  createOverlay() {
    return new Promise((resolve) => {
      this.overlay = document.createElement('div');
      this.overlay.className = 'job-tracker-overlay';
      this.overlay.innerHTML = `
        <div class="job-tracker-header">
          <h3 class="job-tracker-title">Nimp.AI</h3>
          <button class="job-tracker-close" title="Close">&times;</button>
        </div>
        <div class="job-tracker-content">
          <div class="counter-section">
            <h4 class="counter-label">Applications Today</h4>
            <div class="counter-display">
              <span class="counter-value" id="counter-value">0</span>
              <div class="streak-display">
                <span class="streak-value" id="streak-value">0</span>
                <span class="streak-emoji">🔥</span>
              </div>
              <div class="counter-buttons">
                <button class="counter-button increment">+1</button>
                <button class="counter-button reset">Reset</button>
              </div>
            </div>
          </div>
          <div class="job-tracker-description" id="job-description">
            <p>Click "Scrape Description" to extract the job description from this page.</p>
          </div>
          <div class="job-tracker-buttons">
            <button class="job-tracker-button scrape-button">Scrape Description</button>
            <button class="job-tracker-button generate-button" disabled>Generate</button>
          </div>
        </div>
        <div class="job-tracker-status"></div>
      `;

      document.body.appendChild(this.overlay);
      resolve();
    });
  }

  async checkStreak() {
    const today = new Date().toDateString();
    
    if (this.lastUpdated) {
      const lastDate = new Date(this.lastUpdated).toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      
      if (today === lastDate) {
        // Same day, keep streak
      } else if (yesterday === lastDate) {
        // Yesterday, keep streak
      } else {
        // Streak broken
        this.streak = 0;
      }
    }
    
    this.updateStreakDisplay();
  }

  updateCounterDisplay() {
    const counterElement = this.overlay.querySelector('#counter-value');
    if (counterElement) {
      counterElement.textContent = this.counter;
      counterElement.classList.add('pulse');
      setTimeout(() => counterElement.classList.remove('pulse'), 300);
    }
  }

  updateStreakDisplay() {
    const streakElement = this.overlay.querySelector('#streak-value');
    if (streakElement) {
      streakElement.textContent = this.streak;
    }
  }

  async loadCounter() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['manualCounter', 'streak', 'lastUpdated'], (result) => {
        this.counter = result.manualCounter || 0;
        this.streak = result.streak || 0;
        this.lastUpdated = result.lastUpdated;
        this.updateCounterDisplay();
        this.updateStreakDisplay();
        resolve();
      });
    });
  }

  async saveCounter() {
    const today = new Date();
    return new Promise((resolve) => {
      chrome.storage.local.set({
        manualCounter: this.counter,
        streak: this.streak,
        lastUpdated: today.toISOString()
      }, resolve);
    });
  }

  setupEventListeners() {
    // Close button
    this.overlay.querySelector('.job-tracker-close').addEventListener('click', () => {
      this.overlay.classList.remove('visible');
      setTimeout(() => {
        this.overlay.remove();
      }, 300);
    });

    // Counter increment button
    this.overlay.querySelector('.increment').addEventListener('click', async () => {
      const today = new Date().toDateString();
      const lastDate = this.lastUpdated ? new Date(this.lastUpdated).toDateString() : null;

      if (today !== lastDate && this.counter === 0) {
        // First application of a new day
        this.streak++;
      }
      
      this.counter++;
      this.lastUpdated = new Date().toISOString();
      
      this.updateCounterDisplay();
      this.updateStreakDisplay();
      await this.saveCounter();
    });

    // Counter reset button
    this.overlay.querySelector('.reset').addEventListener('click', async () => {
      this.counter = 0;
      this.updateCounterDisplay();
      await this.saveCounter();
    });

    // Scrape button
    this.overlay.querySelector('.scrape-button').addEventListener('click', async () => {
      try {
        const jobData = this.scrapeJobDescription();
        const descriptionElement = this.overlay.querySelector('#job-description');
        descriptionElement.innerHTML = `<h4>${jobData.title}</h4><p>${jobData.description}</p>`;
        this.overlay.querySelector('.generate-button').disabled = false;
        this.showStatus('Description scraped successfully!', 'success');
      } catch (error) {
        console.error('Failed to scrape job description:', error);
        this.showStatus('Error scraping description', 'error');
      }
    });

    // Generate button
    this.overlay.querySelector('.generate-button').addEventListener('click', async () => {
      const generateButton = this.overlay.querySelector('.generate-button');
      const descriptionElement = this.overlay.querySelector('#job-description');
      
      try {
        generateButton.disabled = true; // Disable button during processing
        this.showStatus('Generating custom resume...', 'info');
        console.log('Generate button clicked.');

        // Get job details from the page
        console.log('Scraping job description...');
        const jobData = this.scrapeJobDescription();
        console.log('Job data scraped:', jobData);

        // Load user's resume data from the JSON file
        console.log('Loading resume data...');
        const resumeData = await this.loadResumeData();
        console.log('Resume data loaded.');

        // Check API Key before proceeding
        console.log('Checking API key...');
        const apiKey = await this.getApiKey();
        if (!apiKey) {
          throw new Error('ChatGPT API key not configured. Please set it in extension options.');
        }
        console.log('API key found.');

        // Generate custom resume using ChatGPT API
        console.log('Calling generateCustomResume...');
        const customResume = await this.generateCustomResume(jobData, resumeData);
        console.log('Custom resume generated.');
        
        // Display the generated resume
        descriptionElement.innerHTML = `
          <h4>Custom Resume for: ${jobData.title}</h4>
          <div class="generated-resume">${customResume}</div>
          <div class="resume-actions">
            <button class="download-pdf-button">Download as PDF</button>
          </div>
        `;
        
        // Add event listener for the PDF download button
        this.overlay.querySelector('.download-pdf-button').addEventListener('click', () => {
          this.downloadAsPdf(customResume, jobData.title);
        });
        
        this.showStatus('Resume Generated!', 'success');
        
      } catch (error) {
        console.error('Failed to generate resume:', error);
        descriptionElement.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        this.showStatus(`Error: ${error.message}`, 'error');
      } finally {
         generateButton.disabled = false; // Re-enable button after completion or error
      }
    });
  }

  scrapeJobDescription() {
    const selectors = [
      '.job-details-about-the-job-module__description',
      '.description__text',
      '.jobDescriptionText',
      '.job-description',
      '.job-description-content'
    ];

    let description = 'N/A';
    let title = 'N/A';

    const titleSelectors = [
      '.top-card-layout__title',
      '.jobsearch-JobInfoHeader-title',
      '.jobTitle'
    ];

    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        title = element.innerText.trim();
        break;
      }
    }

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        description = element.innerText
          .replace(/\s+/g, ' ')
          .replace(/show less|show more/g, '')
          .trim();
        break;
      }
    }

    if (description === 'N/A') {
      throw new Error('Could not find job description on this page');
    }

    return {
      title,
      description,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };
  }

  async loadResumeData() {
    return new Promise((resolve, reject) => {
      // Add check for chrome.runtime and getURL
      if (typeof chrome === 'undefined' || !chrome.runtime || typeof chrome.runtime.getURL !== 'function') {
          const errorMsg = 'Error: chrome.runtime.getURL is not available in this context.';
          console.error(errorMsg);
          return reject(new Error(errorMsg + ' Cannot load resume.'));
      }

      const resumeUrl = chrome.runtime.getURL('resume.json');
      console.log('Fetching resume from:', resumeUrl);
      fetch(resumeUrl)
        .then(async response => { // Make the callback async to await text()
          console.log('Resume fetch response status:', response.status);
          if (!response.ok) {
            throw new Error(`Failed to load resume.json (Status: ${response.status}). Check manifest.json web_accessible_resources.`);
          }
          // Get the response text first to check if it's empty
          const text = await response.text();
          if (!text) {
            console.error('Error: resume.json is empty.');
            throw new Error('resume.json is empty.');
          }
          try {
            // Now parse the text
            const data = JSON.parse(text);
            console.log('Successfully parsed resume.json');
            resolve(data);
          } catch (parseError) {
            console.error('Error parsing resume.json:', parseError);
            console.error('Raw response text:', text); // Log the raw text
            throw new Error('Failed to parse resume.json. Ensure it is valid JSON.');
          }
        })
        .catch(err => {
          console.error('Error loading or processing resume.json:', err);
          reject(err); // Propagate the error
        });
    });
  }

  async generateCustomResume(jobData, resumeData) {
    const apiKey = await this.getApiKey();
    
    if (!apiKey) {
      throw new Error('ChatGPT API key not configured.');
    }
    
    const prompt = `
Create a tailored resume for the following job:

JOB TITLE: ${jobData.title}

JOB DESCRIPTION:
${jobData.description}

CANDIDATE INFORMATION:
${JSON.stringify(resumeData, null, 2)}

Instructions:
1. Format the resume professionally using HTML tags (e.g., <h2>, <p>, <ul>, <li>).
2. Highlight skills and experiences that directly match the job description requirements. Use <strong> or <b> tags for emphasis.
3. Use bullet points (<ul> and <li>) for lists of responsibilities, achievements, or skills.
4. Do not invent or hallucinate any information not present in the CANDIDATE INFORMATION.
5. Focus strictly on relevant experience and skills for this specific job.
6. Return only the formatted HTML content for the resume body, without <!DOCTYPE>, <html>, <head>, or <body> tags.
`;
    console.log('Sending prompt to OpenAI API...');

    let response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { 
              role: "system", 
              content: "You are a professional resume writer. Create tailored resumes based on job descriptions and candidate info. Format your response as clean HTML body content (no html, head, body tags)."
            },
            { 
              role: "user", 
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });
    } catch (networkError) {
      console.error('Network error fetching from OpenAI API:', networkError);
      throw new Error(`Network error communicating with OpenAI: ${networkError.message}`);
    }


    console.log('OpenAI API response status:', response.status);
    const responseText = await response.text(); // Get raw text first

    if (!response.ok) {
      let errorPayload = null;
      let errorMessage = `HTTP error ${response.status}`;
      // Try parsing as JSON only if the content type suggests it
      if (responseText && response.headers.get('content-type')?.includes('application/json')) {
        try {
          errorPayload = JSON.parse(responseText);
          console.error('OpenAI API Error Payload:', errorPayload);
          errorMessage = errorPayload?.error?.message || errorMessage;
        } catch (e) {
          console.error('Could not parse JSON error response from OpenAI API. Raw text:', responseText);
        }
      } else {
         console.error('Received non-JSON error response from OpenAI API. Status:', response.status, 'Raw text:', responseText);
      }
      throw new Error(`ChatGPT API error: ${errorMessage}`);
    }

    // Try parsing the successful response as JSON
    let data;
    if (responseText && response.headers.get('content-type')?.includes('application/json')) {
        try {
            data = JSON.parse(responseText);
            console.log('OpenAI API Success Payload:', data);
        } catch (e) {
            console.error('Could not parse JSON success response from OpenAI API. Raw text:', responseText);
            throw new Error('Received an invalid JSON response from ChatGPT API.');
        }
    } else {
        console.error('Received non-JSON success response from OpenAI API. Raw text:', responseText);
        throw new Error('Received an unexpected non-JSON response from ChatGPT API.');
    }


    if (!data.choices || data.choices.length === 0 || !data.choices[0].message || !data.choices[0].message.content) {
        console.error('Invalid response structure from OpenAI API:', data);
        throw new Error('Received an unexpected response format from ChatGPT API.');
    }
    
    return data.choices[0].message.content;
  }

  async getApiKey() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['chatgptApiKey'], (result) => {
        console.log('Retrieved API Key:', result.chatgptApiKey ? 'Yes' : 'No');
        resolve(result.chatgptApiKey);
      });
    });
  }

  downloadAsPdf(resumeContent, jobTitle) {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    iframe.contentDocument.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Resume for ${jobTitle}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.5;
            margin: 2cm;
          }
          h1, h2, h3, h4 {
            color: #333;
          }
          .section {
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <h1>Resume for ${jobTitle}</h1>
        ${resumeContent}
      </body>
      </html>
    `);
    
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  }

  showStatus(message, type = '') {
    const statusElement = this.overlay.querySelector('.job-tracker-status');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = 'job-tracker-status';
      setTimeout(() => {
          statusElement.classList.add(type, 'visible');
      }, 10); 
      
      if (this.statusTimeout) clearTimeout(this.statusTimeout);
      this.statusTimeout = setTimeout(() => {
        statusElement.classList.remove('visible', type);
      }, 3000);
    }
  }
}

function extractJobDetails() {
  const jobTitle = document.querySelector('.top-card-layout__title')?.innerText || 'Unknown Title';
  const companyName = document.querySelector('.top-card-layout__second-subline span')?.innerText || 'Unknown Company';
  const jobDescription = document.querySelector('.description__text')?.innerText || 'No Description Available';

  return {
    title: jobTitle,
    company: companyName,
    description: jobDescription,
    url: window.location.href
  };
}

function saveJob() {
  const jobData = extractJobDetails();
  chrome.runtime.sendMessage({ action: 'saveJob', jobData }, (response) => {
    if (response.success) {
      alert('Job saved successfully!');
    } else {
      console.error('Error saving job:', response.error);
    }
  });
}

function addSaveJobButton() {
  const buttonContainer = document.querySelector('.top-card-layout__cta');
  if (buttonContainer) {
    const saveButton = document.createElement('button');
    saveButton.innerText = 'Save Job';
    saveButton.style.cssText = `
      background-color: #0073b1;
      color: white;
      border: none;
      padding: 10px;
      margin-left: 10px;
      cursor: pointer;
    `;
    saveButton.addEventListener('click', saveJob);
    buttonContainer.appendChild(saveButton);
  }
}

window.addEventListener('load', addSaveJobButton);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new JobTracker());
} else {
  new JobTracker();
}