// Load saved jobs from storage and display them
chrome.storage.local.get(['savedJobs'], (result) => {
  const jobs = result.savedJobs || [];
  const jobsContainer = document.getElementById('jobs');

  if (jobs.length === 0) {
    jobsContainer.innerText = 'No jobs saved.';
  } else {
    jobs.forEach((job) => {
      const jobElement = document.createElement('div');
      jobElement.className = 'job';
      jobElement.innerHTML = `
        <strong>${job.title}</strong><br>
        <em>${job.company}</em><br>
        <p>${job.description}</p>
        <a href="${job.url}" target="_blank">View Job</a>
      `;
      jobsContainer.appendChild(jobElement);
    });
  }
});

document.getElementById('open-settings').addEventListener('click', () => {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('options.html'));
  }
});