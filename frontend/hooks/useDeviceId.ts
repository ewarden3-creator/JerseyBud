import { useEffect, useState } from "react";

export function useDeviceId(): string {
  const [id, setId] = useState("");
  useEffect(() => {
    let stored = localStorage.getItem("njcanna_device_id");
    if (!stored) {
      stored = crypto.randomUUID();
      localStorage.setItem("njcanna_device_id", stored);
    }
    setId(stored);
  }, []);
  return id;
}
