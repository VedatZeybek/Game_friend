const BASE_URL = "http://localhost:5000/api/users";

// Tüm kullanıcıları çek
export const fetchUsers = async () => {
  const token = localStorage.getItem("token"); // token protected route için
  const res = await fetch(BASE_URL, {
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });
  return res.json(); // backend'den dönen kullanıcı listesi
};

// Belirli kullanıcıyı çek
export const fetchUserById = async (userId) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/${userId}`, {
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });
  return res.json();
};
