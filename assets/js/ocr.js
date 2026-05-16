function initPayPage() {
  const sel = document.getElementById("kelasTiket");
  const harga = parseInt(sel.value) || 0;
  const pax = parseInt(document.getElementById("jumlahPax").value) || 1;
  const total = harga * pax;
  document.getElementById("payTotal").textContent = "Rp " + total.toLocaleString("id-ID");

  document.getElementById("ocrProgressCard").style.display = "none";
  document.getElementById("ocrResultCard").style.display = "none";
  document.getElementById("btnKonfirmasi").style.display = "none";
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById("uploadZone").classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) processFile(file);
}

// function handleFileChange(e) {
//   const files = e.target.files;
//   if (files.length > 0) {
//     processMultipleFiles(files);
//   }
// }

// async function processMultipleFiles(files) {
//   gotoStep(3);
//   document.getElementById("ocrProgressCard").style.display = "block";
//   document.getElementById("ocrLog").innerHTML = `> Memulai pemrosesan masal: ${files.length} dokumen...<br>`;

//   for (let i = 0; i < files.length; i++) {
//     const file = files[i];
//     document.getElementById("ocrLog").innerHTML += `<br>> Memproses [${i + 1}/${files.length}]: ${file.name}...<br>`;
    
//     // Update progress bar per file
//     let progress = Math.round(((i + 1) / files.length) * 100);
//     document.getElementById("progFill").style.width = progress + "%";
//     document.getElementById("progPct").textContent = progress + "%";

//     try {
//       await runOCRPipeline(file);
//     } catch (err) {
//       // Sesuai instruksi Fase 1 Bagian 2: Catat error dan lanjut ke dokumen berikutnya
//       document.getElementById("ocrLog").innerHTML += `<span style="color:red">> ERROR pada ${file.name}: Dokumen rusak/format salah. Melanjutkan...</span><br>`;
//     }
//   }
//   document.getElementById("ocrLog").innerHTML += "<br><strong>> PEMROSESAN MASAL SELESAI.</strong>";
// }

function processFile(file) {
  if (file.size > 5 * 1024 * 1024) {
    alert("Ukuran file melebihi 5 MB");
    return;
  }

  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById("imgPreview").src = ev.target.result;
    document.getElementById("imgPreviewWrap").style.display = "block";
    document.getElementById("imgName").textContent = file.name;
    document.getElementById("imgSize").textContent = (file.size / 1024).toFixed(1) + " KB";
  };
  reader.readAsDataURL(file);

  gotoStep(3);

  document.getElementById("ocrProgressCard").style.display = "block";
  document.getElementById("ocrResultCard").style.display = "none";
  document.getElementById("manualNotifCard").style.display = "none";
  document.getElementById("btnRow3").style.display = "none";
  document.getElementById("btnKonfirmasi").style.display = "none";
  document.getElementById("btnLihatStatus").style.display = "none";

  document.getElementById("ocrLog").innerHTML = "";
  document.getElementById("progFill").style.width = "0%";
  document.getElementById("progPct").textContent = "0%";

  runOCRPipeline(file);
}
// ocr.js

// Fungsi utama untuk memproses banyak file (Standard Robustness)
async function processMultipleFiles(files) {
  gotoStep(3);
  document.getElementById("ocrProgressCard").style.display = "block";
  document.getElementById("ocrLog").innerHTML = `> Memulai pemrosesan masal: ${files.length} dokumen...<br>`;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    document.getElementById("ocrLog").innerHTML += `<br>> Memproses [${i + 1}/${files.length}]: ${file.name}...<br>`;
    
    let progress = Math.round(((i + 1) / files.length) * 100);
    document.getElementById("progFill").style.width = progress + "%";
    document.getElementById("progPct").textContent = progress + "%";

    try {
      // Menjalankan OCR satu per satu
      await runOCRPipeline(file);
    } catch (err) {
      // Jika satu file gagal, aplikasi tidak crash dan lanjut ke file berikutnya
      document.getElementById("ocrLog").innerHTML += `<span style="color:red">> ERROR pada ${file.name}: Gagal. Melanjutkan...</span><br>`;
    }
  }
  document.getElementById("ocrLog").innerHTML += "<br><strong>> PEMROSESAN MASAL SELESAI.</strong>";
}

async function runOCRPipeline(file) {
  const formData = new FormData();
  formData.append("file", file);
  
  // Identitas unik untuk pengujian
  const kodeTiket = "TEST-" + Math.random().toString(36).substr(2,6).toUpperCase();
  formData.append("kode_tiket", kodeTiket);
  
  try {
    const response = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error);

    const rawText = data.raw_text_detected || "";
    
    // Klasifikasi data berdasarkan teks mentah
    const extracted = classifyAndExtract(rawText);
    state.ocrResult = extracted;

    // KIRIM KE SPREADSHEET (CSV) LEWAT API SIMPAN
    // Data akan dipilah di backend: Skor >= 80 ke CSV, < 80 ke Log Error
    await fetch("/api/simpan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(extracted)
    });
    
    document.getElementById("ocrLog").innerHTML += `> Berhasil mengekstrak data ${file.name} (Skor: ${extracted.confidence}%)<br>`;
    
    // Tampilkan hasil di UI untuk file terakhir
    renderOCRResult(extracted);
    
  } catch (err) {
    document.getElementById("ocrLog").innerHTML += `> Skip file: ${file.name} (Error System)<br>`;
  }
}

// Pastikan fungsi handleFileChange memanggil proses masal
function handleFileChange(e) {
  const files = e.target.files;
  if (files.length > 0) {
    processMultipleFiles(files);
  }
}

function classifyAndExtract(rawText) {
  const hasil = {
    docType: "Bukti Pembayaran",
    nominal: "",
    rrn: "",
    tanggal: "",
    aplikasiAsal: "",
    pengirim: "",
    aplikasiTujuan: "",
    penerima: "",
    confidence: 0
  }

  const cariNominal = rawText.match(/Rp\s?[\d.,]+/)
  if (cariNominal) {
    hasil.nominal = cariNominal[0]
  }

  const cariTanggal = rawText.match(/\d{1,2}\s[a-zA-Z]+\s\d{4}|\d{2}\/\d{2}\/\d{4}/)
  if (cariTanggal) {
    hasil.tanggal = cariTanggal[0]
  }

  const cariRrn = rawText.match(/\b\d{12,}\b/)
  if (cariRrn) {
    hasil.rrn = cariRrn[0]
  }

  const teksKecil = rawText.toLowerCase()

  if (teksKecil.includes("dana")) hasil.aplikasiTujuan = "DANA"
  else if (teksKecil.includes("gopay")) hasil.aplikasiTujuan = "GoPay"
  else if (teksKecil.includes("ovo")) hasil.aplikasiTujuan = "OVO"
  else if (teksKecil.includes("shopeepay")) hasil.aplikasiTujuan = "ShopeePay"

  if (teksKecil.includes("mandiri")) hasil.aplikasiAsal = "Bank Mandiri"
  else if (teksKecil.includes("bca")) hasil.aplikasiAsal = "Bank BCA"
  else if (teksKecil.includes("bni")) hasil.aplikasiAsal = "Bank BNI"
  else if (teksKecil.includes("bri")) hasil.aplikasiAsal = "Bank BRI"

  let skorBaru = 0
  if (hasil.nominal) skorBaru += 40
  if (hasil.aplikasiTujuan) skorBaru += 30
  if (hasil.tanggal || hasil.rrn) skorBaru += 30
  
  hasil.confidence = skorBaru

  return hasil
}

function renderOCRResult(r) {
  document.getElementById("ocrResultCard").style.display = "block";
  document.getElementById("btnRow3").style.display = "flex";

  const fields = [
    ["Total / Nominal", r.nominal || "(tidak terbaca)"],
    ["Kode Ref / RRN", r.rrn || "(tidak terbaca)"],
    ["Tanggal", r.tanggal || "(tidak terbaca)"],
    ["Aplikasi Pengirim", r.aplikasiAsal],
    ["Nama Pengirim", r.pengirim || "(tidak terbaca)"],
    ["Tujuan Aplikasi", r.aplikasiTujuan],
    ["Nama Penerima", r.penerima || "(tidak terbaca)"],
  ];
  
  document.getElementById("ocrResultRows").innerHTML = fields.map(([l, v]) =>
    `<div class="result-row">
      <span class="result-label">${l}</span>
      <span class="result-val">${v}</span>
    </div>`
  ).join("");

  document.getElementById("confScore").textContent = r.confidence + "%";
  document.getElementById("confFill").style.width = r.confidence + "%";

  const validEl = document.getElementById("validasiBlock");
  const sel = document.getElementById("kelasTiket");
  const harga = parseInt(sel.value) || 0;
  const pax = parseInt(document.getElementById("jumlahPax").value) || 1;
  const expected = harga * pax;
  const nomClean = r.nominal ? parseInt(r.nominal.replace(/[^\d]/g,"")) : 0;

  validEl.innerHTML = "";
  
  if (nomClean > 0 && nomClean < expected) {
    const selisih = expected - nomClean;
    validEl.innerHTML = `<div class="alert alert-danger" style="margin-bottom:8px;"><span class="alert-icon">❌</span><div class="alert-content"><strong>Pembayaran Gagal</strong> Nominal Anda kurang. Tagihan Rp ${expected.toLocaleString("id-ID")} namun sistem membaca Rp ${nomClean.toLocaleString("id-ID")}. Silakan unggah ulang.</div></div>`;
    document.getElementById("btnKonfirmasi").style.display = "none";
    document.getElementById("btnLihatStatus").style.display = "none";
  } else if (nomClean === 0 || r.confidence < 60) {
    validEl.innerHTML = `<div class="alert alert-danger" style="margin-bottom:8px;"><span class="alert-icon">❌</span><div class="alert-content"><strong>Pembayaran Gagal</strong> Bukti tidak valid atau gagal terbaca. Silakan unggah ulang gambar yang lebih terang.</div></div>`;
    document.getElementById("btnKonfirmasi").style.display = "none";
    document.getElementById("btnLihatStatus").style.display = "none";
  } else {
    validEl.innerHTML = `<div class="alert alert-success" style="margin-bottom:8px;"><span class="alert-icon">✅</span><div class="alert-content"><strong>Validasi Lolos</strong> Data cocok dan pembayaran berhasil diverifikasi.</div></div>`;
    document.getElementById("btnKonfirmasi").style.display = "block";
    document.getElementById("btnLihatStatus").style.display = "none";
  }
}
function konfirmasiPembayaran() {
  gotoStep(4);
}