'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerIncidences = document.querySelector('.incidences');

const inputType = document.querySelector('.form__input--type');
const inputTrash =  document.querySelector('#trash-type');
const inputSurface = document.querySelector('.form__input--surface');
const inputDescription = document.querySelector('.form__input--description');

const btnPrev = document.querySelector('.pagination__btn--prev');
const btnNext = document.querySelector('.pagination__btn--next');
const btnCloseForm = document.querySelector('.btn__close_form');
const btnSubmitForm = document.querySelector('.form__btn');

const curPageEl = document.querySelector('.pagination__current');

class Incidence {
  date = new Date();
  coords;
  id = (Date.now() + '').slice(-10);

  constructor(coords, urgencyLevel, description) {
    this.coords = coords;
    this.urgencyLevel = urgencyLevel;
    this.description = description;
  }
}

class Infrastucture extends Incidence {
  type = 'infrastucture';
  constructor(coords, urgencyLevel, description, surface) {
    super(coords, urgencyLevel, description);
    this.surface = surface;
  }
}

class Maintenance extends Incidence {
  type = 'maintenance';
  constructor(coords, urgencyLevel, description, trashType) {
    super(coords, urgencyLevel, description);
    this.trashType = trashType;
  }
}

//------------- APP ------------------
class App {
  #map;
  #mapEvent;
  #incidences = [];
  #currentPage = 1;
  #itemsPerPage = 5;
  #markers = [];


  constructor() {
    //Get users position
    this._getPosition();

    //Get data from local storage
    this.getLocalStorage();

    //Event Handlers
    form.addEventListener('submit', this._newIncidence.bind(this));
    btnCloseForm.addEventListener('click', this._hideForm.bind(this));

    inputType.addEventListener('change', this._toggleField.bind(this));
    containerIncidences.addEventListener('click', this.moveToPopup.bind(this));
    btnPrev.addEventListener('click', this._goToPrevPage.bind(this))
    btnNext.addEventListener('click',this._goToNextPage.bind(this) )
    

    containerIncidences.addEventListener(
      'click',
      this._deleteIncidence.bind(this)
    );
  }
  //************** EVENT HANDLERS ***********

  _deleteIncidence(e) {
    const btn = e.target.closest('.incidence__delete');
    if (!btn) return;

    const incidenceEl = btn.closest('.incidence');
    const incidenceId = incidenceEl.dataset.id;

    const index = this.#incidences.findIndex(
      incidence => incidence.id === incidenceId
    );
    this.#incidences.splice(index, 1);
    incidenceEl.remove();
    const markerIndex = this.#markers.findIndex(m=> m.id === incidenceId);

    
   this.#map.removeLayer(this.#markers[markerIndex]);


    this.setLocalStorage();
   
  }
  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert('Could not get your position');
      }
    );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    console.log(coords);
    this.#map = L.map('map').setView(coords, 13);
    this.#incidences.forEach(incidence => {
      this._renderMarker(incidence);
    });
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //Click on map
    this.#map.on('click', this._showForm.bind(this));
  }
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    console.log('llega')
  }

  _hideForm() {
   
    inputDescription.value = inputSurface.value = inputTrash.value = '';
    document.getElementById('u1').checked = true;
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleField() {
    inputSurface.closest('.form__row').classList.toggle('form__row--hidden');
    inputTrash.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newIncidence(e) {
    e.preventDefault();
    const inputUrgency = +document.querySelector(
      'input[name="urgency"]:checked'
    ).value;

    //check if values are ok
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    //check is values are positive
    const positiveValues = (...values) => values.every(inp => inp > 0);

    const type = inputType.value;
    const urgencyLevel = inputUrgency;
    const description = inputDescription.value;
    const { lat, lng } = this.#mapEvent.latlng;
    const coords = [lat, lng];
    let incidence;
    
    if (type === 'infrastucture') {
      const surface = +inputSurface.value;
      console.log(surface)

      if (!validInputs(surface) || !positiveValues(surface))
        return alert('Las unidades deben estar en positivo');

      incidence = new Infrastucture(coords, urgencyLevel, description, surface);
    }
    

    if (type === 'maintenance') {
      const trashType = inputTrash.value;
      if (!validInputs(urgencyLevel))
        return alert('Inputs must be positive numbers');
      incidence = new Maintenance(coords, urgencyLevel, description, trashType);
    }

    this.#incidences.push(incidence);
    console.log(this.#incidences);

    this._renderMarker(incidence);
    this._hideForm();
    this._renderIncidenceList(incidence);
    this.setLocalStorage();
  }

  _renderMarker(incidence) {

    const customIcon = L.divIcon({
      className: 'custom-marker-wrapper',
      html: `<div class="marker-pin ${incidence.type}"></div>`,
      iconSize: [30,30],
      iconAnchor: [15,15]
    });

    const marker = L.marker(incidence.coords, {icon: customIcon})
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: true,
          closeOnClick: false,
          className: `${incidence.type}-popup`,
        })
      )
      .setPopupContent(
        `${
          incidence.description}`
      )
      .openPopup();
      marker.id = incidence.id;
      this.#markers.push(marker);

      setTimeout(()=>{
        marker.closePopup()
      } , 3000);
  }

  _renderIncidence(incidence) {

    
    const dateOptions = {day: 'numeric', month: 'short', hour:'numeric', minute: 'numeric'};
    const formattedDate = new Intl.DateTimeFormat('es-ES', dateOptions).format(new Date(incidence.date))
    const dots = '●'.repeat(incidence.urgencyLevel).padEnd(5, '○');
    let html = `
    <li class="incidence incidence--${incidence.type}" data-id="${incidence.id}">
      
      <span class="incidence__date">${formattedDate}</span>
      <button class="incidence__delete btn__delete" title="Eliminar">
        <i data-lucide="x"></i>
      </button>

      <div class="incidence__content">
        <h2 class="incidence__title">${incidence.description}</h2>
        
        <div class="incidence__urgency-bar">
          <span class="incidence__urgency-dots">${dots}</span>
        </div>

        <div class="incidence__data">
          <span class="incidence__value">
            ${incidence.type === 'infrastucture' ? `${incidence.surface} m²` : `${incidence.trashType}`}
          </span>
          <span class="incidence__unit">
            ${incidence.type === 'maintenance' ? '' : ''}
          </span>
        </div>
      </div>

    </li>`;
  containerIncidences.insertAdjacentHTML('beforeend', html);
 
}

_renderIncidenceList (){
  containerIncidences.innerHTML = "";
  const start = (this.#currentPage - 1) * this.#itemsPerPage;
  const end = this.#currentPage * this.#itemsPerPage;

  const pageIncidences = this.#incidences.slice(start, end);

  pageIncidences.forEach(incidence => this._renderIncidence(incidence))

 lucide.createIcons();

  this._updatePagination();
}

_updatePagination (){
  const totalPages = Math.ceil (this.#incidences.length/this.#itemsPerPage);
  curPageEl.textContent = this.#currentPage;
  btnPrev.disabled = this.#currentPage === 1;
  btnNext.disabled = this.#currentPage === totalPages || totalPages === 0;
}

_goToNextPage(){
  this.#currentPage ++;
  this._renderIncidenceList();
}

_goToPrevPage(){
  this.#currentPage --;
  this._renderIncidenceList();
}

  moveToPopup(e) {
    const incidenceEl = e.target.closest('.incidence');

    if (!incidenceEl) return;

    const incidence = this.#incidences.find(
      inc => inc.id === incidenceEl.dataset.id.trim()
    );

    this.#map.setView(incidence.coords, 13, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  //Save incidence in Local Storage
  setLocalStorage() {
    localStorage.setItem('incidences', JSON.stringify(this.#incidences));
  }

  getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('incidences'));

    if (!data) return;

    this.#incidences = data;
    this.#incidences.forEach(incidence => {
      this._renderIncidenceList(incidence);
    });
  }

  resetLocalStorage() {
    localStorage.removeItem('inciden#incidences');
    location.reload();
  }
}
const app = new App();
