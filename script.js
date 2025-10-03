// Configuration
const CONFIG = {
  batchSize: 20,
  throttleDelay: 200
};

// DOM Elements
const elements = {
  promptsBtn: document.getElementById('promptsBtn'),
  menuBtn: document.getElementById('menuBtn'),
  sidebar: document.getElementById('sidebar'),
  closeSidebar: document.getElementById('closeSidebar'),
  sidebarOverlay: document.getElementById('sidebarOverlay'),
  searchPanel: document.getElementById('searchPanel'),
  filterPanel: document.getElementById('filterPanel'),
  filterToggle: document.getElementById('filterToggle'),
  categoryDropdown: document.getElementById('categoryDropdown'),
  searchInput: document.getElementById('searchInput'),
  clearSearch: document.getElementById('clearSearch'),
  promptsPage: document.getElementById('promptsPage'),
  aboutPage: document.getElementById('aboutPage'),
  contactPage: document.getElementById('contactPage'),
  promptsGrid: document.getElementById('promptsGrid'),
  contactForm: document.getElementById('contactForm'),
  footerAbout: document.getElementById('footerAbout'),
  footerContact: document.getElementById('footerContact'),
  applyFilters: document.getElementById('applyFilters'),
  resetFilters: document.getElementById('resetFilters'),
  mobileFilterOverlay: document.getElementById('mobileFilterOverlay'),
  closeMobileFilter: document.getElementById('closeMobileFilter'),
  mobileApplyFilters: document.getElementById('mobileApplyFilters'),
  mobileResetFilters: document.getElementById('mobileResetFilters'),
  linksDot: document.getElementById('linksDot'),
  linksModal: document.getElementById('linksModal'),
  closeLinksModal: document.getElementById('closeLinksModal')
};

// State
let allPrompts = [];
let filteredPrompts = [];
let isLoadingImages = false;
let selectedCategories = new Set(['all']);
let tempSelectedCategories = new Set(['all']);

// Initialize
function init() {
  setupEventListeners();
  loadPromptsFromJSON();
  
  elements.searchPanel.style.display = 'block';
  elements.filterPanel.style.display = 'block';

  // Handle page visibility to reload if needed
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden && (allPrompts.length === 0 || filteredPrompts.length === 0)) {
      loadPromptsFromJSON();
    }
  });

  // Handle page load from cache (back/forward navigation)
  window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
      loadPromptsFromJSON();
    }
  });
}

// Event Listeners
function setupEventListeners() {
  elements.promptsBtn.addEventListener('click', () => {
    switchToPage('prompts');
    closeSidebar();
  });

  elements.menuBtn.addEventListener('click', openSidebar);
  elements.closeSidebar.addEventListener('click', closeSidebar);
  elements.sidebarOverlay.addEventListener('click', closeSidebar);

  document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      switchToPage(page);
      closeSidebar();
    });
  });

  elements.footerAbout.addEventListener('click', (e) => {
    e.preventDefault();
    switchToPage('about');
  });

  elements.footerContact.addEventListener('click', (e) => {
    e.preventDefault();
    switchToPage('contact');
  });

  elements.clearSearch.addEventListener('click', () => {
    elements.searchInput.value = '';
    filterPrompts();
  });

  elements.searchInput.addEventListener('input', throttle(filterPrompts, 300));

  elements.filterToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (window.innerWidth <= 768) {
      showMobileFilterOverlay();
    } else {
      elements.categoryDropdown.classList.toggle('show');
      elements.filterToggle.classList.toggle('active');
    }
  });

  document.addEventListener('click', (e) => {
    if (!elements.filterPanel.contains(e.target) && 
        elements.categoryDropdown.classList.contains('show')) {
      elements.categoryDropdown.classList.remove('show');
      elements.filterToggle.classList.remove('active');
    }
  });

  document.querySelectorAll('.category-container .category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleCategorySelection(btn);
    });
  });

  document.querySelectorAll('.mobile-category-container .category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleMobileCategorySelection(btn);
    });
  });

  elements.applyFilters.addEventListener('click', () => {
    selectedCategories = new Set(tempSelectedCategories);
    filterPrompts();
    elements.categoryDropdown.classList.remove('show');
    elements.filterToggle.classList.remove('active');
  });

  elements.resetFilters.addEventListener('click', () => {
    tempSelectedCategories = new Set(['all']);
    updateCategoryButtons(tempSelectedCategories);
    selectedCategories = new Set(tempSelectedCategories);
    filterPrompts();
    elements.categoryDropdown.classList.remove('show');
    elements.filterToggle.classList.remove('active');
  });

  elements.mobileApplyFilters.addEventListener('click', () => {
    selectedCategories = new Set(tempSelectedCategories);
    filterPrompts();
    hideMobileFilterOverlay();
  });

  elements.mobileResetFilters.addEventListener('click', () => {
    tempSelectedCategories = new Set(['all']);
    updateMobileCategoryButtons(tempSelectedCategories);
    selectedCategories = new Set(tempSelectedCategories);
    filterPrompts();
    hideMobileFilterOverlay();
  });

  elements.closeMobileFilter.addEventListener('click', hideMobileFilterOverlay);
  elements.contactForm.addEventListener('submit', handleContactSubmit);
  window.addEventListener('scroll', throttle(lazyLoadImages, 200));
  window.addEventListener('resize', throttle(lazyLoadImages, 200));
  elements.linksDot.addEventListener('click', showLinksModal);
  elements.closeLinksModal.addEventListener('click', hideLinksModal);

  elements.linksModal.addEventListener('click', (e) => {
    if (e.target === elements.linksModal) {
      hideLinksModal();
    }
  });
}

// UI Functions
function openSidebar() {
  elements.sidebar.classList.add('open');
  elements.sidebarOverlay.classList.add('show');
  document.body.classList.add('sidebar-open');
}

function closeSidebar() {
  elements.sidebar.classList.remove('open');
  elements.sidebarOverlay.classList.remove('show');
  document.body.classList.remove('sidebar-open');
}

function showLinksModal() {
  elements.linksModal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function hideLinksModal() {
  elements.linksModal.classList.remove('show');
  document.body.style.overflow = '';
}

function showMobileFilterOverlay() {
  tempSelectedCategories = new Set(selectedCategories);
  updateMobileCategoryButtons(tempSelectedCategories);
  elements.mobileFilterOverlay.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function hideMobileFilterOverlay() {
  elements.mobileFilterOverlay.classList.remove('show');
  document.body.style.overflow = '';
}

function handleCategorySelection(btn) {
  const category = btn.dataset.category;
  if (category === 'all') {
    tempSelectedCategories.clear();
    tempSelectedCategories.add('all');
    updateCategoryButtons(tempSelectedCategories);
  } else {
    tempSelectedCategories.delete('all');
    if (tempSelectedCategories.has(category)) {
      tempSelectedCategories.delete(category);
      btn.classList.remove('active');
      if (tempSelectedCategories.size === 0) {
        tempSelectedCategories.add('all');
        document.querySelector('.category-container [data-category="all"]').classList.add('active');
      }
    } else {
      tempSelectedCategories.add(category);
      btn.classList.add('active');
      document.querySelector('.category-container [data-category="all"]').classList.remove('active');
    }
  }
}

function handleMobileCategorySelection(btn) {
  const category = btn.dataset.category;
  if (category === 'all') {
    tempSelectedCategories.clear();
    tempSelectedCategories.add('all');
    updateMobileCategoryButtons(tempSelectedCategories);
  } else {
    tempSelectedCategories.delete('all');
    if (tempSelectedCategories.has(category)) {
      tempSelectedCategories.delete(category);
      btn.classList.remove('active');
      if (tempSelectedCategories.size === 0) {
        tempSelectedCategories.add('all');
        document.querySelector('.mobile-category-container [data-category="all"]').classList.add('active');
      }
    } else {
      tempSelectedCategories.add(category);
      btn.classList.add('active');
      document.querySelector('.mobile-category-container [data-category="all"]').classList.remove('active');
    }
  }
}

function updateCategoryButtons(categories) {
  document.querySelectorAll('.category-container .category-btn').forEach(btn => {
    const category = btn.dataset.category;
    btn.classList.toggle('active', categories.has(category));
  });
}

function updateMobileCategoryButtons(categories) {
  document.querySelectorAll('.mobile-category-container .category-btn').forEach(btn => {
    const category = btn.dataset.category;
    btn.classList.toggle('active', categories.has(category));
  });
}

function switchToPage(page) {
  elements.promptsPage.classList.remove('active');
  elements.aboutPage.classList.remove('active');
  elements.contactPage.classList.remove('active');
  elements.promptsBtn.classList.remove('active');

  elements.searchPanel.style.display = 'none';
  elements.filterPanel.style.display = 'none';
  elements.categoryDropdown.classList.remove('show');
  elements.filterToggle.classList.remove('active');

  hideMobileFilterOverlay();
  hideLinksModal();

  switch(page) {
    case 'prompts':
      elements.promptsPage.classList.add('active');
      elements.promptsBtn.classList.add('active');
      elements.searchPanel.style.display = 'block';
      elements.filterPanel.style.display = 'block';
      break;
    case 'about':
      elements.aboutPage.classList.add('active');
      break;
    case 'contact':
      elements.contactPage.classList.add('active');
      break;
  }
}

function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

function handleContactSubmit(e) {
  e.preventDefault();
  alert('Thank you for your message! We will get back to you soon.');
  elements.contactForm.reset();
}

// Data Functions
function filterPrompts() {
  const searchTerm = elements.searchInput.value.toLowerCase();
  filteredPrompts = allPrompts.filter(prompt => {
    const matchesSearch = !searchTerm || 
      prompt.title.toLowerCase().includes(searchTerm) ||
      prompt.description.toLowerCase().includes(searchTerm) ||
      prompt.category.toLowerCase().includes(searchTerm);
    const matchesCategory = selectedCategories.has('all') || 
      selectedCategories.has(prompt.category.toLowerCase());
    return matchesSearch && matchesCategory;
  });
  renderPromptCards();
}

async function loadPromptsFromJSON() {
  try {
    showLoadingState();
    const response = await fetch('prompt.json');
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    processJSONData(data);
  } catch (error) {
    console.error('Error loading prompts:', error);
    showError();
  }
}

function showLoadingState() {
  elements.promptsGrid.innerHTML = Array(12).fill(`
    <div class="prompt-card loading">
      <div class="card-image"></div>
      <div class="card-content">
        <div class="card-title"></div>
      </div>
    </div>
  `).join('');
}

function processJSONData(prompts) {
  allPrompts = prompts.map(prompt => ({
    id: prompt.id,
    fileName: prompt.fileName,
    title: prompt.title || '',
    image: prompt.image || '',
    description: prompt.description || '',
    category: prompt.category || ''
  })).reverse();
  
  filteredPrompts = [...allPrompts];
  renderPromptCards();
}

function showError() {
  elements.promptsGrid.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-exclamation-triangle"></i>
      <p>Failed to load prompts. Please try again later.</p>
    </div>
  `;
}

// Rendering Functions - COMPLETELY REWRITTEN
function renderPromptCards() {
  if (filteredPrompts.length === 0) {
    elements.promptsGrid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-search"></i>
        <p>No prompts found. Try a different search term.</p>
      </div>
    `;
    return;
  }

  // Clear and rebuild the grid completely
  elements.promptsGrid.innerHTML = '';
  
  filteredPrompts.forEach((prompt, index) => {
    const card = createPromptCard(prompt, index);
    elements.promptsGrid.appendChild(card);
  });

  // Start loading visible images
  setTimeout(() => lazyLoadImages(), 100);
}

function createPromptCard(prompt, index) {
  const card = document.createElement('div');
  card.className = 'prompt-card loading';
  card.setAttribute('data-index', index);
  card.setAttribute('data-prompt-id', prompt.id || index);
  
  card.innerHTML = `
    <div class="card-image"></div>
    <div class="card-content">
      <div class="card-title"></div>
      <div class="tags" hidden>${prompt.category}</div>
    </div>
  `;

  // Store prompt data directly on the card element
  card._promptData = prompt;

  card.addEventListener('click', () => {
    if (prompt.fileName) {
      window.location.href = `prompt/${prompt.fileName}`;
    }
  });

  return card;
}

function lazyLoadImages() {
  if (isLoadingImages) return;

  const cards = document.querySelectorAll('.prompt-card.loading');
  if (cards.length === 0) return;

  isLoadingImages = true;
  const viewportHeight = window.innerHeight;
  let loadedInThisBatch = 0;

  for (let card of cards) {
    if (loadedInThisBatch >= CONFIG.batchSize) break;

    const rect = card.getBoundingClientRect();
    const isVisible = (rect.top <= viewportHeight * 2) && 
                     (rect.bottom >= -viewportHeight * 0.5);

    if (isVisible) {
      // Use the data stored directly on the card element
      const prompt = card._promptData;
      
      if (!prompt || !prompt.image) {
        console.warn('Missing prompt data for card:', card);
        showErrorCard(card, 'Missing data');
        continue;
      }

      loadSingleImage(card, prompt);
      loadedInThisBatch++;
    }
  }

  setTimeout(() => {
    isLoadingImages = false;
    if (document.querySelectorAll('.prompt-card.loading').length > 0) {
      lazyLoadImages();
    }
  }, CONFIG.throttleDelay);
}

function loadSingleImage(card, prompt) {
  const img = new Image();
  
  img.onload = () => {
    card.classList.remove('loading');
    card.innerHTML = `
      <img class="card-image" src="images/${prompt.image}" alt="${prompt.title}" loading="lazy">
      <div class="card-content">
        <h3 class="card-title">${prompt.title}</h3>
        <div class="tags" hidden>${prompt.category}</div>
      </div>
    `;

    const imgElement = card.querySelector('.card-image');
    setTimeout(() => imgElement.classList.add('loaded'), 50);

    // Reattach click event
    card.addEventListener('click', () => {
      if (prompt.fileName) {
        window.location.href = `prompt/${prompt.fileName}`;
      }
    });
  };

  img.onerror = () => {
    showErrorCard(card, 'Image failed to load');
  };

  img.src = `images/${prompt.image}`;
}

function showErrorCard(card, message) {
  card.classList.remove('loading');
  card.innerHTML = `
    <div class="card-image" style="background: #eee; display: grid; place-items: center;">
      <i class="fas fa-exclamation-triangle" style="font-size: 2em; color: #ccc;"></i>
    </div>
    <div class="card-content">
      <h3 class="card-title">${message}</h3>
    </div>
  `;
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
