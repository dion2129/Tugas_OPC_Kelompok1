import os

def analisis_kinerja():
    file_log = "log_error.txt"
    file_csv = "data_pembayaran.csv"
    
    total_sukses = 0
    total_gagal = 0
    skor_rendah = 0
    nominal_kurang = 0
    dokumen_rusak = 0
    
    if os.path.exists(file_csv):
        with open(file_csv, "r") as f:
            baris = f.readlines()
            if len(baris) > 0:
                total_sukses = len(baris) - 1
                
    if os.path.exists(file_log):
        with open(file_log, "r") as f:
            baris_log = f.readlines()
            total_gagal = len(baris_log)
            
            for baris in baris_log:
                if "SKOR RENDAH" in baris:
                    skor_rendah += 1
                elif "DITOLAK" in baris:
                    nominal_kurang += 1
                elif "FAIL" in baris or "ERROR" in baris:
                    dokumen_rusak += 1
                    
    total_transaksi = total_sukses + total_gagal
    
    print("LAPORAN ANALISIS KINERJA OCR")
    print("Total Transaksi Masuk: ", total_transaksi)
    print("Berhasil Lolos Validasi: ", total_sukses)
    print("Gagal Validasi: ", total_gagal)
    print("Detail Kegagalan: ")
    print("1 Skor Bacaan Rendah: ", skor_rendah)
    print("2 Nominal Uang Kurang: ", nominal_kurang)
    print("3 Gambar Rusak atau Tidak Terbaca: ", dokumen_rusak)

if __name__ == "__main__":
    analisis_kinerja()