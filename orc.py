import os
import csv
from datetime import datetime
import pytesseract
import cv2
from flask import Flask, render_template, request, send_from_directory, jsonify

app = Flask(__name__, static_folder="assets", static_url_path="/assets")

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
FILE_CSV = "data_pembayaran.csv"

def siapkan_csv():
    if not os.path.exists(FILE_CSV):
        with open(FILE_CSV, mode="w", newline="") as file:
            writer = csv.writer(file)
            writer.writerow(["Waktu","Nominal", "Kode Ref", "Tanggal ", "App Pengirim", "Nama Pengirim", "App Tujuan", "Nama Penerima", "Confidence Score"])

@app.route("/")
def index():
    return send_from_directory(".", "index.html")

@app.route("/api/upload", methods=["POST"])
def api_upload():
    siapkan_csv()
    file = request.files.get("file")
    kode_tiket = request.form.get("kode_tiket", "TEST-MODE")
    
    if not file:
        return jsonify({"error": "File kosong"}), 400

    path_simpan = os.path.join("assets", "temp_uji.jpg")
    file.save(path_simpan)

    # Global Exception Handling (Instruksi Fase 1 Bagian 2)
    try:
        img = cv2.imread(path_simpan)
        if img is None:
            raise Exception("Format gambar rusak atau tidak didukung")
            
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        teks_hasil = pytesseract.image_to_string(gray).strip()
        
        # Simpan ke Spreadsheet jika berhasil (Instruksi Bagian 3)
        return jsonify({"raw_text_detected": teks_hasil, "status": "success"})
        
    except Exception as e:
        # Mencatat error ke log tanpa mematikan aplikasi
        waktu = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open("log_error.txt", mode="a") as f:
            f.write(f"[{waktu}] FAIL: {file.filename} | Detail: {str(e)}\n")
            
        # Mengembalikan status error agar frontend bisa lanjut ke file berikutnya
        return jsonify({"error": "Dokumen rusak", "status": "skipped"}), 422

@app.route("/api/simpan", methods=["POST"])
def api_simpan():
    data = request.json
    skor = data.get("confidence", 0)
    tagihan = data.get("tagihan", 0)
    waktu = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    header = ["Waktu", "Nominal", "RRN", "Tanggal", "App Pengirim", "Nama Pengirim", "App Tujuan", "Nama Penerima", "Confidence Score"]
    file_csv = "data_pembayaran.csv"
    
    if not os.path.exists(file_csv):
        with open(file_csv, mode="w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(header)
            
    def bersihkan_teks(teks):
        if isinstance(teks, str):
            return teks.replace("\n", " ").replace("\r", " ").strip()
        return teks
        
    nominal_str = data.get("nominal", "")
    angka_bersih = "".join(filter(str.isdigit, nominal_str))
    nominal_masuk = int(angka_bersih) if angka_bersih else 0
        
    if skor >= 80 and nominal_masuk >= tagihan and nominal_masuk > 0:
        with open(file_csv, mode="a", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                waktu,
                bersihkan_teks(data.get("nominal", "(tidak terbaca)")),
                bersihkan_teks(data.get("rrn", "(tidak terbaca)")),
                bersihkan_teks(data.get("tanggal", "(tidak terbaca)")),
                bersihkan_teks(data.get("aplikasiAsal", "(tidak terbaca)")),
                bersihkan_teks(data.get("pengirim", "(tidak terbaca)")),
                bersihkan_teks(data.get("aplikasiTujuan", "(tidak terbaca)")),
                bersihkan_teks(data.get("penerima", "(tidak terbaca)")),
                f"{skor}%"
            ])
        return jsonify({"status": "success"})
    else:
        with open("log_error.txt", mode="a") as f:
            f.write(f"[{waktu}] DITOLAK Skor {skor}% Nominal Rp{nominal_masuk} Tagihan Rp{tagihan} Data {data}\n")
        return jsonify({"status": "error"})
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)