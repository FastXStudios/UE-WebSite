// state.js
const State = {
    _squad: localStorage.getItem('uzx_squad') || 'OFICIAL',
    _page: 'home',
    _listeners: {},
  
    get squad() {
      return this._squad;
    },
  
    set squad(value) {
      this._squad = value;
      localStorage.setItem('uzx_squad', value);
      document.body.className = `squad-${value.toLowerCase()}`;
      this.emit('squadChange', value);
    },
  
    get page() {
      return this._page;
    },
  
    set page(value) {
      this._page = value;
      this.emit('pageChange', value);
    },
  
    on(event, callback) {
      if (!this._listeners[event]) {
        this._listeners[event] = [];
      }
      this._listeners[event].push(callback);
    },
  
    emit(event, data) {
      (this._listeners[event] || []).forEach(callback => callback(data));
    }
  };
  
  export default State;