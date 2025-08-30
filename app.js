// Importar Preact y hooks
import { render, h } from "https://esm.sh/preact@10.19.3";
import { useState, useEffect } from "https://esm.sh/preact@10.19.3/hooks";

// Importar Supabase
import { supabase } from "./supabase.js";

// Componente de Login
function LoginForm({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      onLogin();
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return h(
    "form",
    { className: "login-form", onSubmit: handleLogin },
    h("input", {
      type: "email",
      placeholder: "Email",
      value: email,
      onInput: (e) => setEmail(e.target.value),
      required: true,
    }),
    h("input", {
      type: "password",
      placeholder: "Password",
      value: password,
      onInput: (e) => setPassword(e.target.value),
      required: true,
    }),
    h(
      "button",
      { type: "submit", disabled: loading },
      loading ? "Entrando..." : "Entrar"
    )
  );
}

// Componente para el header admin
function AdminHeader() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        checkUser();
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (!error && data?.role === "admin") {
          setIsAdmin(true);
        }
      }
    } catch (error) {
      console.error("Error checking user:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!user) {
    return h(LoginForm, { onLogin: checkUser });
  }

  return h(
    "div",
    { className: "admin-info" },
    h(
      "span",
      { className: "admin-text" },
      `${isAdmin ? "👑 Admin" : "Usuario"}`
    ),
    h(
      "button",
      {
        className: "logout-btn",
        onClick: handleLogout,
      },
      "Salir"
    )
  );
}

// Componente de Crop de Imagen
function ImageCropModal({ isOpen, imageFile, onCrop, onCancel }) {
  const [cropper, setCropper] = useState(null);
  const imageRef = useState(null);

  useEffect(() => {
    if (isOpen && imageFile && imageRef.current) {
      // Crear preview URL
      const imageUrl = URL.createObjectURL(imageFile);
      imageRef.current.src = imageUrl;

      // Inicializar Cropper
      const cropperInstance = new Cropper(imageRef.current, {
        aspectRatio: 2, // 400x200 = 2:1
        viewMode: 1,
        dragMode: "move",
        autoCropArea: 1,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
      });

      setCropper(cropperInstance);

      return () => {
        cropperInstance.destroy();
        URL.revokeObjectURL(imageUrl);
      };
    }
  }, [isOpen, imageFile]);

  const handleCrop = () => {
    if (cropper) {
      // Obtener canvas con dimensiones exactas
      const canvas = cropper.getCroppedCanvas({
        width: 400,
        height: 200,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: "high",
      });

      // Convertir a blob
      canvas.toBlob(
        (blob) => {
          onCrop(blob);
        },
        "image/jpeg",
        0.8
      );
    }
  };

  if (!isOpen) return null;

  return h(
    "div",
    { className: "modal-overlay" },
    h(
      "div",
      { className: "crop-modal-content" },
      h("h3", null, "Recortar Imagen"),
      h(
        "div",
        { className: "crop-container" },
        h("img", {
          ref: (el) => (imageRef.current = el),
          style: { maxWidth: "100%" },
        })
      ),
      h(
        "div",
        { className: "crop-buttons" },
        h("button", { onClick: onCancel }, "Cancelar"),
        h(
          "button",
          {
            onClick: handleCrop,
            className: "crop-btn",
          },
          "Recortar"
        )
      )
    )
  );
}

// Componente Modal de Edición
function EditEventModal({ event, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    description: event?.description || "",
    location: event?.location || "",
    event_type: event?.event_type || "",
    event_date: event?.event_date || "",
    image_url: event?.image_url || "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);

  useEffect(() => {
    if (event) {
      setFormData({
        description: event.description || "",
        location: event.location || "",
        event_type: event.event_type || "",
        event_date: event.event_date
          ? event.event_date.split("T")[0] +
            "T" +
            event.event_date.split("T")[1].substring(0, 5)
          : "",
        image_url: event.image_url || "",
      });
    }
  }, [event]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImageFile(file);
      setShowCropModal(true);
    }
  };

  const handleCropComplete = (croppedBlob) => {
    // Usar la imagen recortada
    setImageFile(croppedBlob);
    setShowCropModal(false);

    // Preview de la imagen recortada
    const reader = new FileReader();
    reader.onload = (e) => {
      setFormData((prev) => ({ ...prev, image_url: e.target.result }));
    };
    reader.readAsDataURL(croppedBlob);
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setSelectedImageFile(null);
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      let finalImageUrl = formData.image_url;

      // Si hay una nueva imagen, subirla primero
      if (imageFile) {
        let fileName;

        // Si es un Blob (imagen recortada), usar extensión por defecto
        if (imageFile instanceof Blob) {
          fileName = `${event.id}-${Date.now()}.jpg`;
        } else {
          // Si es un File original, usar su extensión
          const fileExt = imageFile.name.split(".").pop();
          fileName = `${event.id}-${Date.now()}.${fileExt}`;
        }

        console.log("Uploading file:", fileName, imageFile);

        const { data, error } = await supabase.storage
          .from("event-images")
          .upload(fileName, imageFile);

        if (error) throw error;

        // Obtener URL pública
        const { data: urlData } = supabase.storage
          .from("event-images")
          .getPublicUrl(fileName);

        finalImageUrl = urlData.publicUrl;
      }

      // Actualizar evento en la base de datos
      const { error } = await supabase
        .from("events")
        .update({
          description: formData.description,
          location: formData.location,
          event_type: formData.event_type,
          event_date: formData.event_date,
          image_url: finalImageUrl,
        })
        .eq("id", event.id);

      if (error) throw error;

      onSave();
      onClose();
    } catch (error) {
      alert("Error al guardar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return h(
    "div",
    { className: "modal-overlay", onClick: onClose },
    h(
      "div",
      { className: "modal-content", onClick: (e) => e.stopPropagation() },
      h("h3", null, "Editar Evento"),

      // Preview de imagen
      formData.image_url &&
        h("img", {
          src: formData.image_url,
          alt: "Preview",
          className: "image-preview",
        }),

      // Upload de imagen
      h(
        "div",
        { className: "form-group" },
        h("label", null, "Cambiar imagen:"),
        h("input", {
          type: "file",
          accept: "image/*",
          onChange: handleImageChange,
        })
      ),

      // Campos del formulario
      h(
        "div",
        { className: "form-group" },
        h("label", null, "Descripción:"),
        h("input", {
          type: "text",
          value: formData.description,
          onInput: (e) => handleInputChange("description", e.target.value),
        })
      ),

      h(
        "div",
        { className: "form-group" },
        h("label", null, "Ubicación:"),
        h("input", {
          type: "text",
          value: formData.location,
          onInput: (e) => handleInputChange("location", e.target.value),
        })
      ),

      h(
        "div",
        { className: "form-group" },
        h("label", null, "Tipo:"),
        h(
          "select",
          {
            value: formData.event_type,
            onChange: (e) => handleInputChange("event_type", e.target.value),
          },
          h("option", { value: "Música" }, "Música"),
          h("option", { value: "Deportes" }, "Deportes"),
          h("option", { value: "Gastronomía" }, "Gastronomía"),
          h("option", { value: "Cultural" }, "Cultural")
        )
      ),

      h(
        "div",
        { className: "form-group" },
        h("label", null, "Fecha y hora:"),
        h("input", {
          type: "datetime-local",
          value: formData.event_date,
          onInput: (e) => handleInputChange("event_date", e.target.value),
        })
      ),

      // Botones
      h(
        "div",
        { className: "modal-buttons" },
        h("button", { onClick: onClose }, "Cancelar"),
        h(
          "button",
          {
            onClick: handleSave,
            disabled: saving,
            className: "save-btn",
          },
          saving ? "Guardando..." : "Guardar"
        )
      ),

      // Modal de crop
      h(ImageCropModal, {
        isOpen: showCropModal,
        imageFile: selectedImageFile,
        onCrop: handleCropComplete,
        onCancel: handleCropCancel,
      })
    )
  );
}

// Componente para un evento individual
function EventCard({ event, isAdmin, onEdit }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    };

    return date.toLocaleDateString("es-MX", options);
  };

  return h(
    "div",
    { className: "event-card" },
    // Imagen del evento (si existe)
    event.image_url &&
      h("img", {
        src: event.image_url,
        alt: event.description,
        className: "event-image",
        onError: (e) => {
          e.target.style.display = "none";
        },
      }),

    h(
      "div",
      { className: "event-content" },
      h(
        "div",
        { className: "event-date-chip" },
        h("span", { className: "material-icons" }, "calendar_today"),
        h("span", null, formatDate(event.event_date))
      ),
      h("h3", { className: "event-title" }, event.description),
      h(
        "div",
        { className: "event-location" },
        h("span", { className: "material-icons" }, "location_on"),
        h("span", null, event.location)
      ),
      h("div", { className: "event-type-chip" }, `🎵 ${event.event_type}`),

      // Botón Edit solo si es admin
      isAdmin &&
        h(
          "button",
          {
            className: "edit-btn",
            onClick: () => onEdit(event),
          },
          "Editar"
        )
    )
  );
}

// Componente principal
function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Estados para el modal
  const [editingEvent, setEditingEvent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Verificar usuario actual
  useEffect(() => {
    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        checkUser();
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Verificar si es admin
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (!error && data?.role === "admin") {
          setIsAdmin(true);
        }
      }
    } catch (error) {
      console.error("Error checking user:", error);
    }
  };

  // Cargar eventos
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });

      if (error) {
        console.error("Error:", error);
      } else {
        setEvents(data || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingEvent(null);
  };

  const handleSaveEvent = () => {
    // Recargar eventos después de guardar
    fetchEvents();
  };

  if (loading) {
    return h("p", null, "Cargando eventos...");
  }

  return h(
    "div",
    null,
    // Lista de eventos
    events.length === 0
      ? h("p", null, "No hay eventos disponibles.")
      : events.map((event) =>
          h(EventCard, {
            key: event.id,
            event: event,
            isAdmin: isAdmin,
            onEdit: handleEdit,
          })
        ),

    // Modal de edición
    h(EditEventModal, {
      event: editingEvent,
      isOpen: showEditModal,
      onClose: handleCloseModal,
      onSave: handleSaveEvent,
    })
  );
}

// Renderizar la app principal
render(h(App), document.getElementById("events-container"));

// Renderizar también el área admin en el header
render(h(AdminHeader), document.getElementById("admin-area"));
