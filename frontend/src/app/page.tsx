"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [status, setStatus] = useState("확인 중...");

  useEffect(()=> {
    fetch("/api/health")
    .then((res)=> res.json())
    .then((data) => setStatus(data.status))
    .catch(() => setStatus("연결 실패"))
  }, []);

  return (
    <main>Django 상태: {status}</main>
  );
}
