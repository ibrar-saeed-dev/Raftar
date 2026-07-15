import { createStore, combineReducers } from 'redux';

// Initial state
const initialState = {
  users: [],
  drivers: [],
  trips: [],
  payments: [],
  analytics: {},
  loading: false,
  error: null
};

// Reducer
const adminReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'SET_USERS':
      return { ...state, users: action.payload };
    case 'SET_DRIVERS':
      return { ...state, drivers: action.payload };
    case 'SET_TRIPS':
      return { ...state, trips: action.payload };
    case 'SET_PAYMENTS':
      return { ...state, payments: action.payload };
    case 'SET_ANALYTICS':
      return { ...state, analytics: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

// Create store
export const store = createStore(
  combineReducers({
    admin: adminReducer
  }),
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
);

export default store;