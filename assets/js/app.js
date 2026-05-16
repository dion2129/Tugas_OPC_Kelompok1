// assets/js/app.js
function masukModeUji() {
  resetApp()
  gotoStep(2)
  document.getElementById("payTotal").textContent = "MODE UJI OCR"
}
// 1. STATE & KONSTANTA
const TAKEN_SEATS = [2, 5, 7, 11, 14, 18, 3, 9];
const KODE_KOTA = { 'Banjarmasin':'BDJ','Palangkaraya':'PKY','Banjarbaru':'BJB',
                    'Surabaya':'SUB','Jakarta':'JKT','Yogyakarta':'JOG',
                    'Semarang':'SRG','Bali':'DPS' };

const BASE_PRICES = {
  'Banjarmasin-Surabaya': 36593,
  'Surabaya-Banjarmasin': 36593,
  'Jakarta-Surabaya': 250000,
  'Surabaya-Jakarta': 250000,
  'Jakarta-Yogyakarta': 120000,
  'Yogyakarta-Jakarta': 120000,
  'Jakarta-Bali': 450000,
  'Bali-Jakarta': 450000,
  'Surabaya-Bali': 150000,
  'Bali-Surabaya': 150000,
  'Banjarmasin-Palangkaraya': 85000,
  'Palangkaraya-Banjarmasin': 85000,
  'Banjarmasin-Banjarbaru': 25000,
  'Banjarbaru-Banjarmasin': 25000,
};

function getBasePrice(asal, tujuan) {
  if (!asal || !tujuan) return 0;
  if (asal === tujuan) return 0;
  const key = asal + '-' + tujuan;
  if (BASE_PRICES[key]) return BASE_PRICES[key];
  return 150000 + (asal.length * 1000) + (tujuan.length * 1500); // Default dynamic
}

function updateHarga() {
  const asal = document.getElementById('kotaAsal').value;
  const tujuan = document.getElementById('kotaTujuan').value;
  const sel = document.getElementById('kelasTiket');
  
  if (asal === tujuan && asal.length > 0) {
    alert('Ops! Kota asal dan tujuan tidak boleh sama.');
    return;
  }
  
  const base = getBasePrice(asal, tujuan) || 36593;
  
  sel.innerHTML = '';
  const o1 = new Option(`Ekonomi — Rp ${base.toLocaleString('id-ID')} / orang`, base);
  o1.setAttribute('data-name', 'Ekonomi');
  sel.appendChild(o1);
  
  const bisnis = Math.floor(base * 1.5);
  const o2 = new Option(`Bisnis — Rp ${bisnis.toLocaleString('id-ID')} / orang`, bisnis);
  o2.setAttribute('data-name', 'Bisnis');
  sel.appendChild(o2);
  
  const eks = Math.floor(base * 2.5);
  const o3 = new Option(`Eksekutif — Rp ${eks.toLocaleString('id-ID')} / orang`, eks);
  o3.setAttribute('data-name', 'Eksekutif');
  sel.appendChild(o3);

  if (document.getElementById('sumHarga') && state.step > 0) renderSummary();
}
document.addEventListener('DOMContentLoaded', updateHarga);

let state = {
  step: 0,
  selectedSeats: [],
  ocrResult: {},
  imageFile: null,
  currentFilePrefix: null
};

// 2. NAVIGASI STEPPER
function gotoStep(n) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page' + n).classList.add('active');

  for (let i = 0; i < 5; i++) {
    const el = document.getElementById('st' + i);
    el.classList.remove('active','done');
    if (i < n) el.classList.add('done');
    else if (i === n) el.classList.add('active');
  }

  state.step = n;
  if (n === 1) initSeatPage();
  if (n === 2) initPayPage();
  if (n === 4) renderTicket();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateAndGoToSeat() {
  const pax = parseInt(document.getElementById('jumlahPax').value) || 0;
  if (pax < 1) {
    alert('Jumlah penumpang minimal 1 orang.');
    return;
  }
  const availableSeats = 20 - TAKEN_SEATS.length;
  if (pax > availableSeats) {
    alert(`Mohon maaf, sisa kursi yang tersedia hanya ${availableSeats} kursi.`);
    return;
  }
  if (state.selectedSeats.length > pax) {
    state.selectedSeats = state.selectedSeats.slice(0, pax);
  }
  gotoStep(1);
}

// 3. LOGIKA KURSI (PAGE 1)
function initSeatPage() {
  const grid = document.getElementById('seatGrid');
  grid.innerHTML = '';
  // Dalam 20 kursi untuk bis tipe 2-2:
  for (let i = 1; i <= 20; i++) {
    const s = document.createElement('div');
    s.className = 'seat' + (TAKEN_SEATS.includes(i) ? ' taken' : '');
    s.textContent = i;
    s.dataset.id = i;
    if (!TAKEN_SEATS.includes(i)) s.onclick = () => selectSeat(i);
    grid.appendChild(s);

    // Tambahkan lorong (aisle) setiap setelah kursi ke-2 di tiap baris
    if (i % 4 === 2) {
      const aisle = document.createElement('div');
      aisle.className = 'aisle-spacer';
      grid.appendChild(aisle);
    }
  }
  if (state.selectedSeats.length > 0) {
    state.selectedSeats.forEach(id => {
      const el = grid.querySelector('[data-id="' + id + '"]');
      if (el) el.classList.add('selected');
    });
  }
  // Initialize info text
  const pax = parseInt(document.getElementById('jumlahPax').value) || 1;
  document.getElementById('seatInfo').textContent = `Memilih ${state.selectedSeats.length} dari ${pax} kursi`;
  document.getElementById('btnKeSeat').disabled = state.selectedSeats.length !== pax;
  renderSummary();
}

function selectSeat(id) {
  const pax = parseInt(document.getElementById('jumlahPax').value) || 1;
  const idx = state.selectedSeats.indexOf(id);

  if (idx > -1) {
    state.selectedSeats.splice(idx, 1);
    document.querySelector('.seat[data-id="'+id+'"]').classList.remove('selected');
  } else {
    if (state.selectedSeats.length >= pax) {
      const removedId = state.selectedSeats.shift();
      const removedEl = document.querySelector('.seat[data-id="'+removedId+'"]');
      if (removedEl) removedEl.classList.remove('selected');
    }
    state.selectedSeats.push(id);
    document.querySelector('.seat[data-id="'+id+'"]').classList.add('selected');
  }

  document.getElementById('seatInfo').textContent = `✓ Memilih ${state.selectedSeats.length} dari ${pax} kursi (No: ${state.selectedSeats.join(', ') || '-'})`;
  document.getElementById('btnKeSeat').disabled = state.selectedSeats.length !== pax;
  renderSummary();
}

function renderSummary() {
  const asal   = document.getElementById('kotaAsal').value;
  const tujuan = document.getElementById('kotaTujuan').value;
  const sel    = document.getElementById('kelasTiket');
  const harga  = parseInt(sel.value);
  const pax    = parseInt(document.getElementById('jumlahPax').value) || 1;
  const kelas  = sel.options[sel.selectedIndex].getAttribute('data-name') || 'Ekonomi';
  const total  = harga * pax;

  document.getElementById('sumRute').textContent  = asal + ' → ' + tujuan;
  document.getElementById('sumKelas').textContent  = kelas;
  document.getElementById('sumHarga').textContent  = 'Rp ' + harga.toLocaleString('id-ID');
  document.getElementById('sumPax').textContent    = pax + ' orang';
  document.getElementById('sumTotal').textContent  = 'Rp ' + total.toLocaleString('id-ID');
}

// 4. RESET APLIKASI
function resetApp() {
  state = { step:0, selectedSeats:[], ocrResult:{}, imageFile:null, currentFilePrefix:null };
  document.getElementById('fileInput').value = '';
  document.getElementById('imgPreviewWrap').style.display = 'none';
  
  // Reset Halaman 3 (OCR)
  document.getElementById('ocrProgressCard').style.display = 'none';
  document.getElementById('ocrResultCard').style.display   = 'none';
  document.getElementById('manualNotifCard').style.display = 'none';
  document.getElementById('btnRow3').style.display         = 'none';
  document.getElementById('btnKonfirmasi').style.display   = 'none';
  document.getElementById('btnLihatStatus').style.display  = 'none';

  document.getElementById('ocrLog').innerHTML = '';
  document.getElementById('progFill').style.width = '0%';
  document.getElementById('confFill').style.width = '0%';
  
  document.getElementById('btnKeSeat').disabled = true;
  gotoStep(0);
}

// 5. RENDER E-TIKET (PAGE 4)
// Tambahkan fungsi kontrol UI ini di bagian bawah app.js
function gantiMetodeBayar() {
  const metode = document.getElementById('metodeBayar').value;
  if (metode === 'loket') {
    document.getElementById('qrisSection').style.display = 'none';
    document.getElementById('loketSection').style.display = 'block';
  } else {
    document.getElementById('qrisSection').style.display = 'block';
    document.getElementById('loketSection').style.display = 'none';
  }
}

function konfirmasiLoket() {
  // Langsung set status lunas untuk metode loket (sesuai arahan)
  state.paymentStatus = 'LUNAS';
  state.metode = 'LOKET';
  gotoStep(4);
}

// Ganti fungsi renderTicket yang lama dengan ini
function renderTicket() {
  const asal   = document.getElementById('kotaAsal').value;
  const tujuan = document.getElementById('kotaTujuan').value;
  const tgl    = document.getElementById('tanggal').value;
  const nama   = document.getElementById('namaLengkap').value;
  const sel    = document.getElementById('kelasTiket');
  const harga  = parseInt(sel.value);
  const pax    = parseInt(document.getElementById('jumlahPax').value) || 1;
  const kelas  = sel.options[sel.selectedIndex].getAttribute('data-name') || 'Ekonomi';
  const total  = harga * pax;
  const kode   = 'TG-' + Math.random().toString(36).substr(2,6).toUpperCase();

  const dTgl = new Date(tgl);
  const tglStr = dTgl.toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });

  document.getElementById('tickRute').textContent  = (KODE_KOTA[asal]||asal) + ' → ' + (KODE_KOTA[tujuan]||tujuan);
  document.getElementById('tickDate').textContent  = tglStr;
  document.getElementById('tickNama').textContent  = nama;
  document.getElementById('tickKursi').textContent = 'No. ' + (state.selectedSeats.join(', ') || '?');
  document.getElementById('tickKelas').textContent = kelas;
  document.getElementById('tickTotal').textContent = 'Rp ' + total.toLocaleString('id-ID');
  document.getElementById('tickKode').textContent  = kode;

  // Ubah Badge Status menjadi Hijau/LUNAS
  const statusBadge = document.querySelector('.ticket-confirmed');
  statusBadge.textContent = 'LUNAS';
  statusBadge.style.background = '#1D9E75'; // Warna Hijau

  const r = state.ocrResult || {};
  const detailHtml = state.metode === 'LOKET' 
    ? `<div class="result-row"><span class="result-label">Metode Pembayaran</span><span class="result-val">Bayar di Loket</span></div>
       <div class="result-row"><span class="result-label">Status Verifikasi</span><span class="result-val" style="color:var(--green)">LUNAS (Konfirmasi Manual)</span></div>`
    : `<div class="result-row"><span class="result-label">Platform OCR</span><span class="result-val">${r.aplikasiAsal || 'QRIS'} &rarr; ${r.aplikasiTujuan || 'DANA'}</span></div>
       <div class="result-row"><span class="result-label">Nominal Terbaca</span><span class="result-val" style="color:var(--green)">${r.nominal || 'Sesuai Tagihan'}</span></div>
       <div class="result-row"><span class="result-label">Status Verifikasi</span><span class="result-val" style="color:var(--green)">LUNAS (Otomatis)</span></div>`;

  document.getElementById('ocrSummaryFinal').innerHTML = detailHtml;
}