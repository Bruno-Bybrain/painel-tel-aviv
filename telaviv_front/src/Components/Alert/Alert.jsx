import { ToastContainer, toast, Flip } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Alert.css";

// Funções de alerta
export const alert = {
  warning: (message) =>
    toast.warn(message, {
      className: "toast-danger",
      progressClassName: "progress-light",
      position: "top-center",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: "dark",
      transition: Flip,
    }),

  error: (message) =>
    toast.error(message, {
      className: "toast-danger",
      progressClassName: "progress-light",
      position: "top-center",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: "dark",
      transition: Flip,
    }),

  success: (message) =>
    toast.info(message, {
      className: "toast-success",
      progressClassName: "progress-light",
      position: "top-center",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: "dark",
      transition: Flip,
    }),
};

// Componente para o ToastContainer
const Alert = () => {
  return <ToastContainer className="toastGeral" />;
};

export default Alert;
