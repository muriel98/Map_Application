'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerIncidences = document.querySelector('.incidences');
const inputType = document.querySelector('.form__input--type');

const inputSurface = document.querySelector('.form__input--surface');
const inputTrash = document.querySelector('.form__input--trash');
const inputDescription = document.querySelector('.form__input--description');

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

  constructor() {
    //Get users position
    this._getPosition();

    //Get data from local storage
    this.getLocalStorage();

    //Event Handlers
    form.addEventListener('submit', this._newIncidence.bind(this));

    inputType.addEventListener('change', this._toggleField.bind(this));
    containerIncidences.addEventListener('click', this.moveToPopup.bind(this));

    containerIncidences.addEventListener(
      'click',
      this._deleteIncidence.bind(this)
    );
  }
  //************** EVENT HANDLERS ***********

  _deleteIncidence(e) {
    const btn = e.target.closest('.incidence__btn-delete');
    if (!btn) return;

    const incidenceEl = btn.closest('.incidence');
    const incidenceId = incidenceEl.dataset.id;

    const index = this.#incidences.findIndex(
      incidence => incidence.id === incidenceId
    );
    this.#incidences.splice(index, 1);
    incidenceEl.remove();
    this.setLocalStorage();
    console.log(this.#incidences);
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
    console.log(urgencyLevel);
    if (type === 'infrastucture') {
      const surface = +inputSurface.value;

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
    this._renderIncidence(incidence);
    this.setLocalStorage();
  }

  _renderMarker(incidence) {
    L.marker(incidence.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${incidence.type} -popup`,
        })
      )
      .setPopupContent(
        `${
          incidence.type === 'infrastucture' ? 'Infrastuctura' : 'Mantenimiento'
        }`
      )
      .openPopup();
  }

  _renderIncidence(incidence) {
    const dots = '●'.repeat(incidence.urgencyLevel).padEnd(5, '○');
    let html = `
    <li class="incidence ${
      incidence.type === 'infrastucture'
        ? 'incidence__infrastucture'
        : 'incidence__maintenance'
    } incidence--${incidence.type}" data-id="${incidence.id}">
  
      <div class ="incidence__urgency-bar">
      <span class="incidence__urgency-dots">${dots}</span>
      <div class = "Incidence__container">

      <div class="incidence__header">
        <h2 class="incidence__title">${incidence.description}</h2>
        <button class="incidence__btn-delete" title="Eliminar">
          <i data-lucide="x"></i>
        </button>
      </div>
      
      </div>
      

      <div class="incidence__body">
        <div class="incidence__data">
       
        <span class="incidence__value">
        ${
          incidence.type === 'infrastucture'
            ? incidence.surface
            : incidence.trashType
        }</span>
        <span class="incidence__unit">
        ${incidence.type === 'infrastucture' ? 'm²' : 'Tipo de residuo:'}
        </span>
      
      </div></div>
    </li>`;

    form.insertAdjacentHTML('afterend', html);
    console.log(incidence.type);
    lucide.createIcons();
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
      this._renderIncidence(incidence);
    });
  }

  resetLocalStorage() {
    localStorage.removeItem('inciden#incidences');
    location.reload();
  }
}
const app = new App();
