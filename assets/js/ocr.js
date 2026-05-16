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

function classifyAndExtract(text) {
  const t = text.toUpperCase();
  const tOri = text;

  let nominal = "";
  const nominalPatterns = [/Rp\s*([\d.,]+)/gi, /RP\s*([\d.,]+)/gi, /IDR\s*([\d.,]+)/gi, /TOTAL[^\d]*([\d.,]+)/gi];
  for (const pat of nominalPatterns) {
    const m = tOri.match(pat);
    if (m && m.length > 0) {
      const candidates = [];
      for (const match of m) {
        const cleaned = match.replace(/[^\d]/g, "");
        if (cleaned.length >= 3) candidates.push(parseInt(cleaned));
      }
      if (candidates.length) {
        const valid = candidates.filter(v => v > 10000 && v < 100000000);
        if (valid.length) { nominal = "Rp " + Math.max(...valid).toLocaleString("id-ID"); break; }
      }
    }
  }

  let rrn = "";
  const rrnPat = tOri.match(/(?:RRN|Ref|Referensi|ID Transaksi|Trx ID|No\. Transaksi)[^\d]*([\dA-Z]{8,25})/i);
  if (rrnPat) rrn = rrnPat[1];

  let tanggal = "";
  const tglPatterns = [/\d{1,2}\s*(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)[a-z]*\s*\d{4}/gi, /\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}/g];
  for (const pat of tglPatterns) {
    const m = tOri.match(pat);
    if (m && m[0]) { tanggal = m[0].trim(); break; }
  }

  let aplikasiAsal = "(tidak terbaca)";
  if (t.includes("BRI")) aplikasiAsal = "Bank BRI";
  else if (t.includes("BCA")) aplikasiAsal = "Bank BCA";
  else if (t.includes("MANDIRI")) aplikasiAsal = "Bank Mandiri";
  else if (t.includes("BNI")) aplikasiAsal = "Bank BNI";

  let pengirim = "";
  const pengirimPat = tOri.match(/(?:Pengirim|Dari|Sumber Dana|Nama Pengirim)[:\s\n]+([A-Za-z\s]+)/i);
  if (pengirimPat) pengirim = pengirimPat[1].trim().substring(0, 40).replace(/BANK/i, "").trim();

  let aplikasiTujuan = "(tidak terbaca)";
  if (t.includes("DANA")) aplikasiTujuan = "DANA";
  else if (t.includes("GOPAY")) aplikasiTujuan = "GoPay";
  else if (t.includes("OVO")) aplikasiTujuan = "OVO";
  else if (t.includes("SHOPEE")) aplikasiTujuan = "ShopeePay";

  let penerima = "";
  const mercPat = tOri.match(/(?:Merchant|Penerima|Tujuan|Pembayaran ke)[:\s\n]+([A-Za-z\s]+)/i);
  if (mercPat) penerima = mercPat[1].trim().substring(0, 40).replace(/BANK/i, "").trim();

  let foundFields = 0;
  if (nominal) foundFields++;
  if (rrn) foundFields++;
  if (tanggal) foundFields++;
  if (aplikasiAsal !== "(tidak terbaca)") foundFields++;
  if (pengirim) foundFields++;
  if (aplikasiTujuan !== "(tidak terbaca)") foundFields++;
  if (penerima) foundFields++;

  const confidence = Math.round((foundFields / 7) * 100);

  return { docType: "Bukti Pembayaran", nominal, rrn, tanggal, aplikasiAsal, pengirim, aplikasiTujuan, penerima, confidence };
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