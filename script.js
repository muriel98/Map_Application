'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerIncidences = document.querySelector('.incidences');
const filterForm = document.querySelector('.filter-panel');
const urgencyContainer = document.querySelector('.urgency-rating--filter');
const deleteModal = document.querySelector('.modal-overlay');

const inputType = document.querySelector('.form__input--type');
const inputTrash =  document.querySelector('#trash-type');
const inputSurface = document.querySelector('.form__input--surface');
const inputDescription = document.querySelector('.form__input--description');
const filterTypeInput = document.querySelector('.filter__input');

const btnPrev = document.querySelector('.pagination__btn--prev');
const btnNext = document.querySelector('.pagination__btn--next');
const btnCloseForm = document.querySelector('.btn__close_form');
const btnSubmitForm = document.querySelector('.form__btn');
const btnViewAll = document.querySelector('.btn__view-all');
const btnFilter = document.querySelector ('.btn__filter');
const btnDeleteFilter = document.querySelector ('.filter__btn-reset');
const btnConfirmDelete = document.querySelector('.btn--confirm-delete');
const btnCloseModal = document.querySelector('.btn--close-modal');

const curPageEl = document.querySelector('.pagination__current');

class Incidence {
 

  constructor(coords, urgencyLevel, description, 
    date, id, address) {
    this.coords = coords;
    this.urgencyLevel = urgencyLevel;
    this.description = description;
    this.address = address;
    this.date = date !== undefined ? new Date (date) :  new Date();
    this.id = id !== undefined ? id : (Date.now() + '').slice(-10);
    
  }

  getUrgencyLevel(){
    return '●'.repeat(this.urgencyLevel).padEnd(5, '○');
  }
  getDateFormat (){
    const dateOptions = {day: 'numeric', month: 'short', hour:'numeric', minute: 'numeric'};
    const formattedDate = new Intl.DateTimeFormat('es-ES', dateOptions).format(new Date(this.date))
    return formattedDate;
  }
}

class Infrastucture extends Incidence {
  type = 'infrastucture';
  constructor(coords, urgencyLevel, description, surface, date, id, address,) {
    super(coords, urgencyLevel, description,date,id, address );
    this.surface = surface;
  }

  getPopUp (){
    return `Infrastuctura: ${this.description}`
  }

  getSpecificData (){
    return `${ this.surface} m²`
    
  }
}

class Maintenance extends Incidence {
  type = 'maintenance';
  constructor(coords, urgencyLevel, description, trashType, date, id, address) {
    super(coords, urgencyLevel, description, date, id, address);
    this.trashType = trashType;
  }

   getPopUp (){
    return `Mantenimiento: ${this.description}`
  }
  getSpecificData (){
    return `${ this.trashType}`
    
  }
}

//------------- APP ------------------
class App {
  #map;
  #mapEvent;
  #incidences = [];
  #currentPage = 1;
  #itemsPerPage = 5;
  #deleteId;
  #markers = [];
  #currentFilteredList = [];




  constructor() {
    //Get users position
    this._getPosition();

    //Get data from local storage
    this.getLocalStorage();

    //Event Handlers
    urgencyContainer.addEventListener('change', this.filterUrgencyResults.bind(this));
    filterTypeInput.addEventListener('change', this.filterTypeResults.bind(this));
    btnDeleteFilter.addEventListener('click', this.resetFilter.bind(this))
    form.addEventListener('submit', this._newIncidence.bind(this));
    btnCloseForm.addEventListener('click', this._hideForm.bind(this));
    btnFilter.addEventListener('click', this.toggleFilterForm.bind(this));
    inputType.addEventListener('change', this._toggleField.bind(this));
    containerIncidences.addEventListener('click', this.moveToPopup.bind(this));
    btnPrev.addEventListener('click', this._goToPrevPage.bind(this));
    btnNext.addEventListener('click',this._goToNextPage.bind(this) );
    btnViewAll.addEventListener('click', this._viewAllMarkers.bind(this));
    btnConfirmDelete.addEventListener('click', this._deleteIncidence.bind(this));
    btnCloseModal.addEventListener('click', this._closeModal.bind(this))
    

    containerIncidences.addEventListener(
      'click',
      this._renderDeleteMessage.bind(this)
    );
  }
  //************** EVENT HANDLERS ***********

  _deleteIncidence() {

   if (!this.#deleteId) return;

    const index = this.#incidences.findIndex(
      incidence => incidence.id === this.#deleteId
    );
    this.#incidences.splice(index, 1);
    
    const markerIndex = this.#markers.findIndex(m=> m.id === this.#deleteId);

    this._renderIncidenceList();
   this.#map.removeLayer(this.#markers[markerIndex]);

    this._closeModal();
    this.setLocalStorage();
   
  }

  _renderDeleteMessage (e){
    const btn = e.target.closest('.incidence__delete');
    if (!btn) return;

    const incidenceEl = btn.closest('.incidence');
    this.#deleteId = incidenceEl.dataset.id;
     deleteModal.classList.remove('hidden');
  }

  _closeModal () {
  deleteModal.classList.add('hidden');
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

  filterTypeResults (e){
    const selectedValue = e.target.value;
    this.#currentFilteredList = selectedValue === 'all'? this.#incidences : 
    this.#incidences
    .filter(inc => inc.type=== selectedValue);
    this._renderIncidenceList(this.#currentFilteredList);
    this.#currentPage = 1;
    this.toggleFilterForm();
  }

  filterUrgencyResults (e){
    const selectedValue = +e.target.value;
    this.#currentFilteredList = !selectedValue ? 
    this.#incidences : 
    this.#incidences.filter(inc => inc.urgencyLevel === selectedValue);
    this._renderIncidenceList(this.#currentFilteredList);
    this.#currentPage = 1;
    this.toggleFilterForm();
  }
  resetFilter () {
    this.#currentFilteredList = this.#incidences;
    this._renderIncidenceList();
    this.#currentPage = 1;
    this.toggleFilterForm();
  }

  toggleFilterForm () {
    filterForm.classList.toggle('hidden');
  }

  //INVERSE GEOLOCATION
  async _getAdrress (lat, lng){
    try{
      const response = await fetch 
      (`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);

      const data = await response.json();
      const {road, house_number} = data.address;
      const number = house_number ? 
      `, ${house_number}` :
        ' ';
      const street = road ? road :
      '-';
      return `${street} ${number}`;
    }
    catch(err){
      console.error(err)
    }
  }

  async _newIncidence(e) {
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
    const address = await this._getAdrress(lat, lng);
    console.log(address);
    let incidence;
    
    if (type === 'infrastucture') {
      const surface = +inputSurface.value;
      console.log(surface)

      if (!validInputs(surface) || !positiveValues(surface))
        return alert('Las unidades deben estar en positivo');

      incidence = new Infrastucture(coords,
       urgencyLevel, 
       description, 
       surface, undefined, undefined, address);
    }
    

    if (type === 'maintenance') {
      const trashType = inputTrash.value;
      if (!validInputs(urgencyLevel))
        return alert('Inputs must be positive numbers');
      incidence = new Maintenance(coords, 
        urgencyLevel, 
        description, 
        trashType,undefined, undefined, address);
    }

    this.#incidences.unshift(incidence);
    this.#currentFilteredList = this.#incidences;
   

    this._renderMarker(incidence);
    this._hideForm();
    this.#currentPage = 1;
    this._renderIncidenceList(this.#incidences);
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

      .setPopupContent(incidence.getPopUp())
      .openPopup();
      marker.id = incidence.id;
      marker.on('click', this._handleMarkerClick.bind(this));
      this.#markers.push(marker);

     

      setTimeout(()=>{
        marker.closePopup()
      } , 3000);
  }

  _handleMarkerClick(e) {
    
    const clickedMarkerId = e.target.id;

    const index = this.#incidences.findIndex(el => el.id === clickedMarkerId) + 1;

    const page = Math.ceil(index / this.#itemsPerPage);

    if ( this.#currentPage !== page){
      this.#currentPage = page;
      this._renderIncidenceList();
    }
   
    setTimeout (() => {
      const incidenceEl = document.querySelector(`[data-id="${clickedMarkerId}"]`);
      incidenceEl.scrollIntoView ({
      behavior: 'smooth',
      block: 'center'
    });
    incidenceEl.classList.add(`incidence--${incidenceEl.dataset.type}_active`);
    }, 100)
    

    
  }

  _viewAllMarkers(){
    if (this.#markers.length && this.#markers.length>0 ){
      const group = new L.featureGroup(this.#markers);

      this.#map.fitBounds(group.getBounds(), {
        padding: [50, 50]
      })
      }
    }
   

  _renderIncidence(incidence) {
    const dots = incidence.getUrgencyLevel();
    let html = `
    <li class="incidence incidence--${incidence.type}" data-id="${incidence.id}" data-type="${incidence.type}">
  
  <div class="incidence__header">
    <span class="incidence__date">${incidence.getDateFormat()}</span>
    <span class="incidence__location">${incidence.address}</span>
  </div>

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
        ${incidence.getSpecificData()}
      </span>
    </div>
  </div>

</li>`;
  containerIncidences.insertAdjacentHTML('beforeend', html);
 
}

_renderIncidenceList (incidences = this.#incidences){
  containerIncidences.innerHTML = "";
  const start = (this.#currentPage - 1) * this.#itemsPerPage;
  const end = this.#currentPage * this.#itemsPerPage;
  const pageIncidences = incidences.slice(start, end);

  pageIncidences.forEach(incidence => this._renderIncidence(incidence));

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
  this._renderIncidenceList(this.#currentFilteredList);
}

_goToPrevPage(){
  this.#currentPage --;
  this._renderIncidenceList(this.#currentFilteredList);
}

  moveToPopup(e) {
    const incidenceEl = e.target.closest('.incidence');


    const incidence = this.#incidences.find(
      inc => inc.id === incidenceEl.dataset.id.trim()
    );

    document.querySelectorAll('.incidence').forEach(el => {
      el.classList.
      remove('incidence--infrastucture_active', 'incidence--maintenance_active')
    })
    const activeClass = `incidence--${incidence.type}_active`;
    incidenceEl.classList.add(activeClass);

    
    this._renderMarker(incidence);

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

   
    
    this.#incidences = data.map(el => {
      if (el.type === 'maintenance')
       return new Maintenance (el.coords, 
        el.urgencyLevel, 
        el.description, 
        el.trashType, 
        el.date, 
        el.id,
        el.address);

        if (el.type === 'infrastucture')
        return new Infrastucture (el.coords, 
        el.urgencyLevel, 
        el.description, 
        el.surface, 
        el.date, 
        el.id,
       el.address)

    })
    

    this._renderIncidenceList();
  }

  resetLocalStorage() {
    localStorage.removeItem('#incidences');
    location.reload();
  }
}
const app = new App();

