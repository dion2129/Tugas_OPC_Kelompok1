# import os
# import time
# import csv
# import shutil
# import re
# from datetime import datetime
# import pytesseract
# import cv2

# FOLDER_MASUK = "assets/proses_masuk"
# FOLDER_SELESAI = "assets/selesai"
# FILE_CSV = "data_pembayaran.csv"
# FILE_LOG = "log_error.txt"

# def siapkan_folder():
#     os.makedirs(FOLDER_MASUK, exist_ok=True)
#     os.makedirs(FOLDER_SELESAI, exist_ok=True)
#     if not os.path.exists(FILE_CSV):
#         with open(FILE_CSV, mode="w", newline="") as file:
#             writer = csv.writer(file)
#             writer.writerow(["Waktu", "Nama File", "Teks Terbaca", "Status"])

# def catat_error(pesan):
#     waktu = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
#     with open(FILE_LOG, mode="a") as file:
#         file.write(f"[{waktu}] ERROR {pesan}\n")

# def simpan_ke_csv(nama_file, teks, status):
#     waktu = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
#     with open(FILE_CSV, mode="a", newline="") as file:
#         writer = csv.writer(file)
#         writer.writerow([waktu, nama_file, teks, status])

# def cari_nominal(teks):
#     pola = [r"Rp\s*([\d.,]+)", r"TOTAL[^\d]*([\d.,]+)", r"IDR\s*([\d.,]+)"]
#     for p in pola:
#         cocok = re.findall(p, teks, re.IGNORECASE)
#         if cocok:
#             angka_bersih = cocok[0].replace(".", "").replace(",", "")
#             if angka_bersih.isdigit():
#                 return int(angka_bersih)
#     return 0

# def proses_ocr(path_gambar):
#     img = cv2.imread(path_gambar)
#     gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
#     teks = pytesseract.image_to_string(gray)
#     return teks.strip()

# def jalankan_bot():
#     siapkan_folder()
#     print("Bot pemantau folder berjalan otomatis")
#     while True:
#         daftar_file = os.listdir(FOLDER_MASUK)
#         for nama_file in daftar_file:
#             path_lengkap = os.path.join(FOLDER_MASUK, nama_file)
#             try:
#                 bagian_nama = nama_file.split("_")
#                 harga_tagihan = int(bagian_nama[1]) if len(bagian_nama) > 1 else 0
                
#                 teks_hasil = proses_ocr(path_lengkap)
#                 nominal_terbaca = cari_nominal(teks_hasil)
                
#                 if nominal_terbaca >= harga_tagihan and harga_tagihan > 0:
#                     status = "Valid"
#                 else:
#                     status = "Tidak Valid"
                
#                 simpan_ke_csv(nama_file, teks_hasil, status)
#                 path_baru = os.path.join(FOLDER_SELESAI, nama_file)
#                 shutil.move(path_lengkap, path_baru)
#                 print(f"Berhasil memproses {nama_file} Status {status}")
#             except Exception as e:
#                 catat_error(f"Gagal membaca {nama_file} Detail {str(e)}")
#                 print(f"Dokumen rusak terdeteksi pada {nama_file} Lanjut ke antrean berikutnya")
#         time.sleep(5)

# if __name__ == "__main__":
#     jalankan_bot()