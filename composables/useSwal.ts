import Swal from "sweetalert2"
import "sweetalert2/dist/sweetalert2.min.css"

export function useSwal() {
  const customSwal = Swal.mixin({
    customClass: {
      popup: "rounded-3xl border border-slate-100 shadow-2xl p-6 font-sans bg-white text-slate-900",
      title: "text-[#0f2a4a] text-lg font-bold",
      htmlContainer: "text-slate-600 text-sm mt-2 font-medium",
      confirmButton:
        "px-5 py-2.5 rounded-xl bg-[#0f2a4a] text-white text-sm font-semibold hover:bg-[#1a4a7a] transition-all focus:outline-none mx-1 cursor-pointer",
      cancelButton:
        "px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-all focus:outline-none mx-1 cursor-pointer",
    },
    buttonsStyling: false,
  })

  const toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
    customClass: {
      popup: "rounded-2xl border border-slate-200 shadow-xl p-3 bg-white text-slate-800 text-xs font-bold",
    },
  })

  const confirmAsk = async (options: {
    title: string
    text?: string
    icon?: "warning" | "error" | "success" | "info" | "question"
    confirmText?: string
    cancelText?: string
    danger?: boolean
  }) => {
    const res = await customSwal.fire({
      title: options.title,
      text: options.text,
      icon: options.icon ?? "question",
      showCancelButton: true,
      confirmButtonText: options.confirmText ?? "យល់ព្រម",
      cancelButtonText: options.cancelText ?? "បោះបង់",
      customClass: {
        popup: "rounded-3xl border border-slate-100 shadow-2xl p-6 font-sans bg-white",
        title: "text-[#0f2a4a] text-base font-bold",
        htmlContainer: "text-slate-600 text-sm mt-2 font-medium",
        confirmButton: options.danger
          ? "px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition-all focus:outline-none mx-1 cursor-pointer shadow-xs"
          : "px-5 py-2.5 rounded-xl bg-[#00b4c8] text-white text-sm font-bold hover:bg-[#009fb0] transition-all focus:outline-none mx-1 cursor-pointer shadow-xs",
        cancelButton:
          "px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition-all focus:outline-none mx-1 cursor-pointer",
      },
    })
    return res.isConfirmed
  }

  const alertSuccess = (title: string, text?: string) => {
    return customSwal.fire({
      title,
      text,
      icon: "success",
      confirmButtonText: "យល់ព្រម",
      customClass: {
        popup: "rounded-3xl border border-slate-100 shadow-2xl p-6 font-sans bg-white",
        title: "text-[#0f2a4a] text-base font-bold",
        htmlContainer: "text-slate-600 text-sm mt-2 font-medium",
        confirmButton:
          "px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all focus:outline-none cursor-pointer",
      },
    })
  }

  const alertWarning = (title: string, text?: string) => {
    return customSwal.fire({
      title,
      text,
      icon: "warning",
      confirmButtonText: "យល់ព្រម",
      customClass: {
        popup: "rounded-3xl border border-slate-100 shadow-2xl p-6 font-sans bg-white",
        title: "text-[#0f2a4a] text-base font-bold",
        htmlContainer: "text-slate-600 text-sm mt-2 font-medium",
        confirmButton:
          "px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-all focus:outline-none cursor-pointer",
      },
    })
  }

  const alertError = (title: string, text?: string) => {
    return customSwal.fire({
      title,
      text,
      icon: "error",
      confirmButtonText: "យល់ព្រម",
      customClass: {
        popup: "rounded-3xl border border-slate-100 shadow-2xl p-6 font-sans bg-white",
        title: "text-[#0f2a4a] text-base font-bold",
        htmlContainer: "text-slate-600 text-sm mt-2 font-medium",
        confirmButton:
          "px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition-all focus:outline-none cursor-pointer",
      },
    })
  }

  const showToast = (title: string, icon: "success" | "warning" | "error" | "info" = "success") => {
    return toast.fire({
      icon,
      title,
    })
  }

  return {
    swal: customSwal,
    confirmAsk,
    alertSuccess,
    alertWarning,
    alertError,
    showToast,
  }
}
