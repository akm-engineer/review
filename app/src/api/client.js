import axios from "axios";

const client = axios.create({
  baseURL: "https://zany-lime-bonobo-tux.cyclic.app/",
});

export default client;
