PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE goods (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT,
    warehouse TEXT,
    image_url TEXT,
    system_stock REAL DEFAULT 0,
    reserved_stock REAL DEFAULT 0,
    min_stock REAL DEFAULT 0,
    actual_stock REAL DEFAULT 0,
    unit TEXT DEFAULT 'bộ',
    purchase_price REAL,
    cost_price REAL,
    selling_price REAL,
    supplier TEXT,
    brand TEXT,
    length REAL,
    width REAL,
    thickness REAL,
    status TEXT DEFAULT 'Đủ hàng',
    status_label TEXT DEFAULT 'Đủ hàng',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
INSERT INTO goods VALUES('IMP-1792053338075-0','NL-BMP-MLM-AC','Bề mặt phủ Melamine An Cường','Bề mặt phủ','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',80000.0,80000.0,80000.0,'An Cường',NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338075-1','NL-BMP-MLM-ML','Bề mặt phủ Melamine Minh Long','Bề mặt phủ','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',60000.0,60000.0,60000.0,'Minh Long',NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338075-2','NL-BMP-MLM-TP','Bề mặt phủ Melamine Thuận Phát','Bề mặt phủ','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',50000.0,50000.0,50000.0,'Thuận Phát',NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338075-3','NL-BMP-LAM-01-AC','Bề mặt phủ Laminate 1mm An Cường','Bề mặt phủ','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',580000.0,580000.0,580000.0,'An Cường',NULL,NULL,NULL,1.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338075-4','NL-BMP-LAM-01-ML','Bề mặt phủ Laminate 1mm Minh Long','Bề mặt phủ','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',480000.0,480000.0,480000.0,'Minh Long',NULL,NULL,NULL,1.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338076-5','NL-BMP-LAM-01-TP','Bề mặt phủ Laminate 1mm Thuận Phát','Bề mặt phủ','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',320000.0,320000.0,320000.0,'Thuận Phát',NULL,NULL,NULL,1.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338076-6','NL-BMP-BCK-01-GL','Bề mặt phủ Backer 1mm GreenLam','Bề mặt phủ','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',190000.0,190000.0,190000.0,'GreenLam',NULL,NULL,NULL,1.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338076-7','NL-MDF-THO-03-TP','Tấm MDF Thô 3mm Thuận Phát','Tấm MDF','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',70000.0,70000.0,70000.0,'Thuận Phát',NULL,NULL,NULL,3.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338076-8','NL-MDF-THO-06-TP','Tấm MDF Thô 6mm Thuận Phát','Tấm MDF','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',112000.0,112000.0,112000.0,'Thuận Phát',NULL,NULL,NULL,6.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338076-9','NL-MDF-THO-12-TP','Tấm MDF Thô 12mm Thuận Phát','Tấm MDF','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',230000.0,230000.0,230000.0,'Thuận Phát',NULL,NULL,NULL,12.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338076-10','NL-MDF-THO-15-TP','Tấm MDF Thô 15mm Thuận Phát','Tấm MDF','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',315000.0,315000.0,315000.0,'Thuận Phát',NULL,NULL,NULL,15.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338076-11','NL-BMP-LAM-01-GL','Bề mặt phủ Laminate 1mm GreenLam','Bề mặt phủ','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',320000.0,320000.0,320000.0,'GreenLam',NULL,NULL,NULL,1.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338077-12','NL-MDF-03-GL','Tấm MDF 3mm GreenLam','Tấm MDF','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',95000.0,95000.0,95000.0,'GreenLam',NULL,NULL,NULL,3.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338077-13','NL-MDF-06-GL','Tấm MDF 6mm GreenLam','Tấm MDF','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',112000.0,112000.0,112000.0,'GreenLam',NULL,NULL,NULL,6.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338077-14','NL-MDF-12-GL','Tấm MDF 12mm GreenLam','Tấm MDF','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',215000.0,215000.0,215000.0,'GreenLam',NULL,NULL,NULL,12.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338077-15','NL-MDF-15-GL','Tấm MDF 15mm GreenLam','Tấm MDF','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',315000.0,315000.0,315000.0,'GreenLam',NULL,NULL,NULL,15.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338077-16','NL-MDF-THO-03-AC','Tấm MDF Thô 3mm An Cường','Tấm MDF','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',115000.0,115000.0,115000.0,'An Cường',NULL,NULL,NULL,3.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338077-17','NL-MDF-THO-06-AC','Tấm MDF Thô 6mm An Cường','Tấm MDF','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',205000.0,205000.0,205000.0,'An Cường',NULL,NULL,NULL,6.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338077-18','NL-MDF-THO-12-AC','Tấm MDF Thô 12mm An Cường','Tấm MDF','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',360000.0,360000.0,360000.0,'An Cường',NULL,NULL,NULL,12.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338077-19','NL-MDF-THO-15-AC','Tấm MDF Thô 15mm An Cường','Tấm MDF','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',435000.0,435000.0,435000.0,'An Cường',NULL,NULL,NULL,15.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338077-20','NL-MDF-THO-03-ML','Tấm MDF Thô 3mm Minh Long','Tấm MDF','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',95000.0,95000.0,95000.0,'Minh Long',NULL,NULL,NULL,3.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338077-21','NL-MDF-THO-06-ML','Tấm MDF Thô 6mm Minh Long','Tấm MDF','Kho nguyên liệu','',50.0,10.0,10.0,40.0,'Tấm',112000.0,112000.0,112000.0,'Minh Long',NULL,0.0,0.0,6.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-26 05:28:27');
INSERT INTO goods VALUES('IMP-1792053338077-22','NL-MDF-THO-12-ML','Tấm MDF Thô 12mm Minh Long','Tấm MDF','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',215000.0,215000.0,215000.0,'Minh Long',NULL,NULL,NULL,12.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338077-23','NL-MDF-THO-15-ML','Tấm MDF Thô 15mm Minh Long','Tấm MDF','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',315000.0,315000.0,315000.0,'Minh Long',NULL,NULL,NULL,15.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338078-24','NL-MDF-DW-03-DT','Tấm MDF Dongwwha Thô 3mm Đức Tuấn','Tấm MDF','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',75000.0,75000.0,75000.0,'Đức Tuấn',NULL,NULL,NULL,3.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338078-25','NL-MDF-TL-06-DT','Tấm MDF Thái lan Thô 6mm Đức Tuấn','Tấm MDF','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',150000.0,150000.0,150000.0,'Đức Tuấn',NULL,NULL,NULL,6.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338078-26','NL-MDF-DW-12-DT','Tấm MDF Dongwwha Thô 12mm Đức Tuấn','Tấm MDF','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',228000.0,228000.0,228000.0,'Đức Tuấn',NULL,NULL,NULL,12.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338078-27','NL-MDF-DW-15-DT','Tấm MDF Dongwwha Thô 15mm Đức Tuấn','Tấm MDF','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',279000.0,279000.0,279000.0,'Đức Tuấn',NULL,NULL,NULL,15.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338078-28','NL-MDF-DW-03-NH','Tấm MDF Dongwwha Thô 3mm Nam Hải','Tấm MDF','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',70000.0,70000.0,70000.0,'Nam Hải',NULL,NULL,NULL,3.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338078-29','NL-MDF-DW-06-NH','Tấm MDF Dongwwha Thô 6mm Nam Hải','Tấm MDF','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',123500.0,123500.0,123500.0,'Nam Hải',NULL,NULL,NULL,6.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338078-30','NL-MDF-DW-12-NH','Tấm MDF Dongwwha Thô 12mm Nam Hải','Tấm MDF','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',235000.0,235000.0,235000.0,'Nam Hải',NULL,NULL,NULL,12.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338078-31','NL-MDF-DW-15-NH','Tấm MDF Dongwwha Thô 15mm Nam Hải','Tấm MDF','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',282000.0,282000.0,282000.0,'Nam Hải',NULL,NULL,NULL,15.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338078-32','NL-NEP-15-HD','Nẹp dán cạnh 15mm Hải Đạt','Nẹp dán cạnh','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'md',915.0,915.0,915.0,'Hải Đạt',NULL,NULL,NULL,15.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338078-33','NL-NEP-18-HD','Nẹp dán cạnh 18mm Hải Đạt','Nẹp dán cạnh','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'md',1100.0,1100.0,1100.0,'Hải Đạt',NULL,NULL,NULL,18.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338078-34','NL-NEP-28-HD','Nẹp dán cạnh 28mm Hải Đạt','Nẹp dán cạnh','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'md',1620.0,1620.0,1620.0,'Hải Đạt',NULL,NULL,NULL,28.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338078-35','NL-NEP-32-HD','Nẹp dán cạnh 32mm Hải Đạt','Nẹp dán cạnh','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'md',1930.0,1930.0,1930.0,'Hải Đạt',NULL,NULL,NULL,32.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338078-36','NL-NEP-35-HD','Nẹp dán cạnh 35mm Hải Đạt','Nẹp dán cạnh','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'md',2300.0,2300.0,2300.0,'Hải Đạt',NULL,NULL,NULL,35.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338078-37','NL-NEP-38-HD','Nẹp dán cạnh 38mm Hải Đạt','Nẹp dán cạnh','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'md',2360.0,2360.0,2360.0,'Hải Đạt',NULL,NULL,NULL,38.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338078-38','NL-NEP-43-HD','Nẹp dán cạnh 43mm Hải Đạt','Nẹp dán cạnh','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'md',2390.0,2390.0,2390.0,'Hải Đạt',NULL,NULL,NULL,43.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338079-39','NL-NEP-45-HD','Nẹp dán cạnh 45mm Hải Đạt','Nẹp dán cạnh','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'md',2400.0,2400.0,2400.0,'Hải Đạt',NULL,NULL,NULL,45.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338079-40','NL-NEP-48-HD','Nẹp dán cạnh 48mm Hải Đạt','Nẹp dán cạnh','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'md',2680.0,2680.0,2680.0,'Hải Đạt',NULL,NULL,NULL,48.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338079-41','NL-NEP-55-HD','Nẹp dán cạnh 55mm Hải Đạt','Nẹp dán cạnh','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'md',3008.0,3008.0,3008.0,'Hải Đạt',NULL,NULL,NULL,55.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338079-42','NL-KH','Lót trong cánh Bông khoáng','Lót trong cánh','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',65000.0,65000.0,65000.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338079-43','NL-LTC-28','Lót trong cánh Giấy tổ ong 28mm','Lót trong cánh','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'thanh',27000.0,27000.0,27000.0,NULL,NULL,NULL,NULL,28.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338079-44','NL-LTC','Lót trong cánh Xốp EPS','Lót trong cánh','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',37500.0,37500.0,37500.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338079-45','NL-K','Không','Không','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Bộ',0.0,0.0,0.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338079-46','PK-BL','Bản lề lá 127mm x 102 x 3 201','Bản lề','Kho vật tư và phụ kiện','',0.0,0.0,10.0,0.0,'Cái',55000.0,55000.0,55000.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338079-47','PK-BL-02','Bản lề lá 127mm x 89 x 3 201','Bản lề','Kho vật tư và phụ kiện','',0.0,0.0,10.0,0.0,'Cái',37000.0,37000.0,37000.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338080-48','PK-BL-03','Bản lề lá 100mm x 76 x 3 201','Bản lề','Kho vật tư và phụ kiện','',0.0,0.0,10.0,0.0,'Cái',33000.0,33000.0,33000.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338080-49','PK-BL-04','Bản lề bướm 100mm x 80 x 3','Bản lề','Kho vật tư và phụ kiện','',0.0,0.0,10.0,0.0,'Cái',22000.0,22000.0,22000.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338080-50','PK-BL-05','Bản lề bướm 100mm x 80 x 2.5','Bản lề','Kho vật tư và phụ kiện','',0.0,0.0,10.0,0.0,'Cái',17000.0,17000.0,17000.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338080-51','PK-KH','Khóa cơ 5845 201','Khoá','Kho vật tư và phụ kiện','',0.0,0.0,10.0,0.0,'Cái',295000.0,295000.0,295000.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338080-52','PK-KH-02','Khóa cơ 5845 304','Khoá','Kho vật tư và phụ kiện','',0.0,0.0,10.0,0.0,'Cái',320000.0,320000.0,320000.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338080-53','PK-KH-03','Khóa cơ 7255 201','Khoá','Kho vật tư và phụ kiện','',0.0,0.0,10.0,0.0,'Cái',410000.0,410000.0,410000.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338080-54','PK-KH-04','Khóa cơ 7255 304','Khoá','Kho vật tư và phụ kiện','',0.0,0.0,10.0,0.0,'Cái',450000.0,450000.0,450000.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338080-55','PK-KH-05','Khóa điện tử','Khoá','Kho vật tư và phụ kiện','',0.0,0.0,10.0,0.0,'Cái',1350000.0,1350000.0,1350000.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338080-56','PK-MT','Mắt thần','Mắt thần','Kho vật tư và phụ kiện','',0.0,0.0,10.0,0.0,'Cái',75000.0,75000.0,75000.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338080-57','PK-TD','Tay đẩy thủy lực 40 - 65','Tay đẩy thuỷ lực','Kho vật tư và phụ kiện','',0.0,0.0,10.0,0.0,'Cái',210000.0,210000.0,210000.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338080-58','PK-TD-02','Tay đẩy thủy lực 60 - 85','Tay đẩy thuỷ lực','Kho vật tư và phụ kiện','',0.0,0.0,10.0,0.0,'Cái',255000.0,255000.0,255000.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338080-59','TH-KEO-PP','Keo sữa 2 thành phần Phong Phát','Keo','Kho vật tư tiêu hao','',0.0,10.0,10.0,0.0,'kg',55000.0,55000.0,55000.0,'Phong Phát',NULL,0.0,0.0,0.0,'Hết hàng','Hết hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 16:01:57');
INSERT INTO goods VALUES('IMP-1792053338081-60','TH-KEO','Keo phun cc','Keo','Kho vật tư tiêu hao','',0.0,0.0,10.0,0.0,'kg',60000.0,60000.0,60000.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338081-61','TH-KEO-E','Keo dán cạnh ECON','Keo','Kho vật tư tiêu hao','',0.0,0.0,10.0,0.0,'kg',65000.0,65000.0,65000.0,'ECON',NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338081-62','TH-DINH-ĐT','Đinh F15 Đức Thịnh','Đinh','Kho vật tư tiêu hao','',0.0,0.0,10.0,0.0,'hộp',27000.0,27000.0,27000.0,'Đức Thịnh',NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338081-63','TH-DINH-ĐT-02','Đinh F20 Đức Thịnh','Đinh','Kho vật tư tiêu hao','',0.0,0.0,10.0,0.0,'hộp',35000.0,35000.0,35000.0,'Đức Thịnh',NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338081-64','TH-DINH-ĐT-03','Đinh F30 Đức Thịnh','Đinh','Kho vật tư tiêu hao','',0.0,0.0,10.0,0.0,'hộp',35000.0,35000.0,35000.0,'Đức Thịnh',NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338081-65','TH-DINH-ĐT-04','Đinh U10 Đức Thịnh','Đinh','Kho vật tư tiêu hao','',0.0,0.0,10.0,0.0,'hộp',31000.0,31000.0,31000.0,'Đức Thịnh',NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338081-66','TH-DINH-ĐT-05','Đinh U6 Đức Thịnh','Đinh','Kho vật tư tiêu hao','',0.0,0.0,10.0,0.0,'hộp',29000.0,29000.0,29000.0,'Đức Thịnh',NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338081-67','TH-MANG-T','Màng PE TBSTAR','Màng FE','Kho vật tư tiêu hao','',0.0,0.0,10.0,0.0,'kg',40000.0,40000.0,40000.0,'TBSTAR',NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338081-68','TH-BGB','Bìa giấy bao gói','Bia giấy bao gói','Kho vật tư tiêu hao','',0.0,0.0,10.0,0.0,'kg',17000.0,17000.0,17000.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338081-69','NL-PH-ĐH','Pallet hàng Định Huệ','Pallet hàng','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Cái',69000.0,69000.0,69000.0,'Định Huệ',NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338081-70','NL-MD','Mũi dao CNC','Mũi dao','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Bộ',0.0,0.0,0.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338082-71','NL-LC','Lưỡi cưa đĩa','Lưỡi cưa','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Bộ',0.0,0.0,0.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338082-72','NL-TM-05-MV','Tấm MGO MGO 5mm MỚI VIM','Tấm MGO','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',135000.0,135000.0,135000.0,'MỚI VIM',NULL,NULL,NULL,5.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338082-73','NL-TM-06-MV','Tấm MGO MGO 6mm MỚI VIM','Tấm MGO','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',155000.0,155000.0,155000.0,'MỚI VIM',NULL,NULL,NULL,6.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338082-74','NL-TM-08-MV','Tấm MGO MGO 8mm MỚI VIM','Tấm MGO','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',195000.0,195000.0,195000.0,'MỚI VIM',NULL,NULL,NULL,8.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338082-75','NL-TM-10-MV','Tấm MGO MGO 10mm MỚI VIM','Tấm MGO','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Tấm',239000.0,239000.0,239000.0,'MỚI VIM',NULL,NULL,NULL,10.0,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338082-76','NL-PLY-C','Xương gỗ Plywood Chung','Xương gỗ','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'m3',7000000.0,7000000.0,7000000.0,'Chung',NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338082-77','NL-XUONG-C','Xương gỗ Gỗ ghép thanh Chung','Xương gỗ','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'m3',12500000.0,12500000.0,12500000.0,'Chung',NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338082-78','NL-MDF','Phào MDF','Tấm MDF','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Bộ',0.0,0.0,0.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338082-79','NL-K-02','Không','Không','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Bộ',0.0,0.0,0.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338082-80','TH-VLC-HF','Ron chống cháy có lông Ron chống cháy Hafele','Vật liệu chống cháy','Kho vật tư tiêu hao','',0.0,0.0,10.0,0.0,'thanh',54000.0,54000.0,54000.0,'Hafele',NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338082-81','TH-VLC-V','Ron chống cháy không lông Ron chống cháy VSTE','Vật liệu chống cháy','Kho vật tư tiêu hao','',0.0,0.0,10.0,0.0,'thanh 2,1m',35935.0,35935.0,35935.0,'VSTE',NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338082-82','PK-VLC','Ron giảm chấn Ron chống cháy','Vật liệu chống cháy','Kho vật tư và phụ kiện','',0.0,0.0,10.0,0.0,'Bộ',2900.0,2900.0,2900.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338082-83','NL-BG-HL','Bọc góc L Hoàng Long','Bọc góc','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Cái',330.0,330.0,330.0,'Hoàng Long',NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338082-84','NL-BG-NL','Bọc góc U Ngọc Linh','Bọc góc','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Cái',1145.0,1145.0,1145.0,'Ngọc Linh',NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338083-85','TH-S-PP','Silicone Phong Phát','Slicone','Kho vật tư tiêu hao','',0.0,0.0,10.0,0.0,'lọ',28147.0,28147.0,28147.0,'Phong Phát',NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338083-86','TH-GL-ML','Giẻ lau Minh Lâm','Giẻ lau','Kho vật tư tiêu hao','',0.0,0.0,10.0,0.0,'kg',14000.0,14000.0,14000.0,'Minh Lâm',NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338083-87','TH-XT-ĐT','Xăng thơm Đức Thịnh','Xăng thơm','Kho vật tư tiêu hao','',0.0,0.0,10.0,0.0,'lít',33635.0,33635.0,33635.0,'Đức Thịnh',NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338083-88','NL-HMD','Hao mòn dụng cụ','Hao mòn dụng cụ','Kho nguyên liệu','',0.0,0.0,10.0,0.0,'Bộ',2000.0,2000.0,2000.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338083-89','TH-DD-ĐM','Dây đai Đức Minh','Dây đai','Kho vật tư tiêu hao','',0.0,0.0,10.0,0.0,'kg',26000.0,26000.0,26000.0,'Đức Minh',NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Nhập từ bảng Excel ngày 15/10/2026','2026-10-15 08:37:55','2026-10-15 08:37:55');
INSERT INTO goods VALUES('IMP-1792053338080-50-K','PK-BL-K','Không','Không','Kho vật tư và phụ kiện','',0.0,0.0,10.0,0.0,'Cái',0.0,0.0,0.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Bổ sung theo Tab 4 (Row 53 - Không bản lề)','2026-10-26 02:22:03','2026-10-26 02:22:03');
INSERT INTO goods VALUES('IMP-1792053338080-55-K','PK-KH-K','Không','Không','Kho vật tư và phụ kiện','',0.0,0.0,10.0,0.0,'Bộ',0.0,0.0,0.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Bổ sung theo Tab 4 (Row 59 - Không khóa)','2026-10-26 02:22:03','2026-10-26 02:22:03');
INSERT INTO goods VALUES('IMP-1792053338080-56-K','PK-MT-K','Không','Không','Kho vật tư và phụ kiện','',0.0,0.0,10.0,0.0,'Cái',0.0,0.0,0.0,NULL,NULL,NULL,NULL,NULL,'Đủ hàng','Đủ hàng','Bổ sung theo Tab 4 (Row 61 - Không mắt thần)','2026-10-26 02:22:03','2026-10-26 02:22:03');
INSERT INTO goods VALUES('NL-MDF-THO-09-ML','NL-MDF-THO-09-ML','Tấm MDF Thô 9mm Minh Long','Tấm MDF','Kho Nguyên Vật Liệu',NULL,0.0,0.0,0.0,0.0,'Tấm',160000.0,160000.0,160000.0,'Minh Long',NULL,NULL,NULL,9.0,'Đủ hàng','Đủ hàng',NULL,'2026-10-26 03:01:47','2026-10-26 03:01:47');
INSERT INTO goods VALUES('NL-MDF-THO-18-ML','NL-MDF-THO-18-ML','Tấm MDF Thô 18mm Minh Long','Tấm MDF','Kho Nguyên Vật Liệu',NULL,0.0,0.0,0.0,0.0,'Tấm',370000.0,370000.0,370000.0,'Minh Long',NULL,NULL,NULL,18.0,'Đủ hàng','Đủ hàng',NULL,'2026-10-26 03:01:47','2026-10-26 03:01:47');
INSERT INTO goods VALUES('NL-MDF-THO-09-AC','NL-MDF-THO-09-AC','Tấm MDF Thô 9mm An Cường','Tấm MDF','Kho Nguyên Vật Liệu',NULL,0.0,0.0,0.0,0.0,'Tấm',280000.0,280000.0,280000.0,'An Cường',NULL,NULL,NULL,9.0,'Đủ hàng','Đủ hàng',NULL,'2026-10-26 03:01:47','2026-10-26 03:01:47');
INSERT INTO goods VALUES('NL-MDF-THO-18-AC','NL-MDF-THO-18-AC','Tấm MDF Thô 18mm An Cường','Tấm MDF','Kho Nguyên Vật Liệu',NULL,0.0,0.0,0.0,0.0,'Tấm',520000.0,520000.0,520000.0,'An Cường',NULL,NULL,NULL,18.0,'Đủ hàng','Đủ hàng',NULL,'2026-10-26 03:01:47','2026-10-26 03:01:47');
INSERT INTO goods VALUES('NL-MDF-THO-09-TP','NL-MDF-THO-09-TP','Tấm MDF Thô 9mm Thuận Phát','Tấm MDF','Kho Nguyên Vật Liệu',NULL,0.0,0.0,0.0,0.0,'Tấm',170000.0,170000.0,170000.0,'Thuận Phát',NULL,NULL,NULL,9.0,'Đủ hàng','Đủ hàng',NULL,'2026-10-26 03:01:47','2026-10-26 03:01:47');
INSERT INTO goods VALUES('NL-MDF-THO-18-TP','NL-MDF-THO-18-TP','Tấm MDF Thô 18mm Thuận Phát','Tấm MDF','Kho Nguyên Vật Liệu',NULL,0.0,0.0,0.0,0.0,'Tấm',370000.0,370000.0,370000.0,'Thuận Phát',NULL,NULL,NULL,18.0,'Đủ hàng','Đủ hàng',NULL,'2026-10-26 03:01:47','2026-10-26 03:01:47');
CREATE TABLE warehouse_movements (
        id TEXT PRIMARY KEY,
        good_id TEXT NOT NULL,
        period TEXT NOT NULL,
        opening_stock REAL DEFAULT 0,
        in_stock REAL DEFAULT 0,
        out_stock REAL DEFAULT 0,
        closing_stock REAL DEFAULT 0,
        unit_price REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (good_id) REFERENCES goods(id) ON DELETE CASCADE
      );
CREATE TABLE monthly_payrolls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      employee_code TEXT,
      employee_name TEXT,
      department TEXT,
      position TEXT,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      base_salary REAL DEFAULT 0.0,
      insurance_salary REAL DEFAULT 0.0,
      standard_workdays REAL DEFAULT 26.0,
      actual_workdays REAL DEFAULT 0.0,
      work_salary REAL DEFAULT 0.0,
      meal_allowance REAL DEFAULT 0.0,
      fuel_allowance REAL DEFAULT 0.0,
      phone_allowance REAL DEFAULT 0.0,
      seniority_allowance REAL DEFAULT 0.0,
      total_allowance REAL DEFAULT 0.0,
      total_ot_converted REAL DEFAULT 0.0,
      ot_salary REAL DEFAULT 0.0,
      bonus_amount REAL DEFAULT 0.0,
      insurance_deduction REAL DEFAULT 0.0,
      corporate_insurance REAL DEFAULT 0.0,
      tax_deduction REAL DEFAULT 0.0,
      advance_or_penalties REAL DEFAULT 0.0,
      net_salary REAL DEFAULT 0.0,
      status TEXT DEFAULT 'Bản nháp',
      is_payroll_confirmed INTEGER DEFAULT 0,
      notes TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, month, year)
    );
INSERT INTO monthly_payrolls VALUES(278,2063,'DCD-20261005-1744-Q5RX','Lê Anh Vân','Phòng kinh doanh','Trưởng phòng',10,2026,12000000.0,5500000.0,27.0,0.0,0.0,910000.0,500000.0,300000.0,0.0,1710000.0,0.0,0.0,0.0,577500.0,0.0,0.0,0.0,1132500.0,'Bản nháp',0,'','2026-10-15 14:46:33');
INSERT INTO monthly_payrolls VALUES(279,2091,'DCD-20261005-1674-PDMQ','Hà Hải Lâm','Ban giám đốc','Giám đốc',10,2026,961000.0,5500000.0,27.0,0.0,0.0,910000.0,300000.0,200000.0,0.0,1410000.0,0.0,0.0,0.0,577500.0,0.0,0.0,0.0,1132500.0,'Bản nháp',0,'','2026-10-15 14:46:33');
INSERT INTO monthly_payrolls VALUES(280,2124,'DCD-20261012-0726-FGCN','Mai Thị Ngọc','Phòng tài chính','Trưởng phòng',10,2026,12000000.0,5500000.0,27.0,0.0,0.0,910000.0,500000.0,300000.0,0.0,1710000.0,0.0,0.0,0.0,577500.0,0.0,0.0,0.0,1132500.0,'Bản nháp',0,'','2026-10-15 14:46:33');
INSERT INTO monthly_payrolls VALUES(281,2126,'DCD-20261015-8705-Y6C3','Nguyễn Thị Ngọc','Bộ phận sản xuất','Nhân viên',10,2026,693000.0,5500000.0,27.0,0.0,0.0,910000.0,300000.0,200000.0,0.0,1410000.0,0.0,0.0,0.0,577500.0,0.0,0.0,0.0,832500.0,'Bản nháp',0,'','2026-10-19 08:34:37');
INSERT INTO monthly_payrolls VALUES(282,2127,'DCD-20261015-4287-MQ42','Nguyễn Thị Tuyết','Phòng tài chính','Kế toán',10,2026,350000.0,5500000.0,27.0,0.0,0.0,910000.0,300000.0,200000.0,0.0,1410000.0,0.0,0.0,0.0,577500.0,0.0,0.0,0.0,832500.0,'Bản nháp',0,'','2026-10-19 08:34:37');
INSERT INTO monthly_payrolls VALUES(283,2128,'DCD-20261015-5537-CYNV','Vũ Đức Tiệp','Bộ phận xử lý hồ sơ','Nhân viên',10,2026,300000.0,5500000.0,27.0,0.0,0.0,910000.0,300000.0,200000.0,0.0,1410000.0,0.0,0.0,0.0,577500.0,0.0,0.0,0.0,832500.0,'Bản nháp',0,'','2026-10-19 08:34:37');
INSERT INTO monthly_payrolls VALUES(284,2129,'DCD-20261015-2804-UOO1','Trần Văn Huynh','Bộ phận sản xuất','Nhân viên',10,2026,616000.0,5500000.0,27.0,0.0,0.0,910000.0,300000.0,200000.0,0.0,1410000.0,0.0,0.0,0.0,577500.0,0.0,0.0,0.0,832500.0,'Bản nháp',0,'','2026-10-19 08:34:37');
INSERT INTO monthly_payrolls VALUES(285,2130,'DCD-20261015-0052-NJTB','Trần Văn Lương','Bộ phận sản xuất','Nhân viên',10,2026,400000.0,5500000.0,27.0,0.0,0.0,910000.0,300000.0,200000.0,0.0,1410000.0,0.0,0.0,0.0,577500.0,0.0,0.0,0.0,832500.0,'Bản nháp',0,'','2026-10-19 08:34:37');
INSERT INTO monthly_payrolls VALUES(286,2131,'DCD-20261015-9753-V1S2','Nguyễn Thị Thảo','Bộ phận sản xuất','Nhân viên',10,2026,400000.0,5500000.0,27.0,0.0,0.0,910000.0,300000.0,200000.0,0.0,1410000.0,0.0,0.0,0.0,577500.0,0.0,0.0,0.0,832500.0,'Bản nháp',0,'','2026-10-19 08:34:37');
INSERT INTO monthly_payrolls VALUES(287,2133,'DCD-20261015-1987-XH2X','Trần Văn Thông','Bộ phận sản xuất','Nhân viên',10,2026,350000.0,5500000.0,27.0,0.0,0.0,910000.0,300000.0,200000.0,0.0,1410000.0,0.0,0.0,0.0,577500.0,0.0,0.0,0.0,832500.0,'Bản nháp',0,'','2026-10-19 08:34:37');
INSERT INTO monthly_payrolls VALUES(288,2134,'DCD-20261015-7287-DE16','Trần Văn Nguyên','Bộ phận sản xuất','Nhân viên',10,2026,350000.0,5500000.0,27.0,0.0,0.0,910000.0,300000.0,200000.0,0.0,1410000.0,0.0,0.0,0.0,577500.0,0.0,0.0,0.0,832500.0,'Bản nháp',0,'','2026-10-19 08:34:37');
INSERT INTO monthly_payrolls VALUES(289,2136,'DCD-20261015-4653-KHYC','Nguyễn Thị Hà','Bộ phận sản xuất','Nhân viên',10,2026,350000.0,5500000.0,27.0,0.0,0.0,910000.0,300000.0,200000.0,0.0,1410000.0,0.0,0.0,0.0,577500.0,0.0,0.0,0.0,832500.0,'Bản nháp',0,'','2026-10-19 08:34:37');
INSERT INTO monthly_payrolls VALUES(290,2137,'DCD-20261015-9936-I6J1','Nguyễn Văn Lâm','Bộ phận sản xuất','Nhân viên',10,2026,350000.0,5500000.0,27.0,0.0,0.0,910000.0,300000.0,200000.0,0.0,1410000.0,0.0,0.0,0.0,577500.0,0.0,0.0,0.0,832500.0,'Bản nháp',0,'','2026-10-19 08:34:37');
INSERT INTO monthly_payrolls VALUES(291,2132,'DCD-20261015-5637-NCYI','Nguyễn Thị Ánh','Bộ phận sản xuất','Nhân viên',10,2026,350000.0,5500000.0,27.0,0.0,0.0,910000.0,300000.0,200000.0,0.0,1410000.0,0.0,0.0,0.0,577500.0,0.0,0.0,0.0,832500.0,'Bản nháp',0,'','2026-10-19 08:34:37');
INSERT INTO monthly_payrolls VALUES(292,2135,'DCD-20261015-6736-AOAK','Nguyễn Thị Linh','Bộ phận sản xuất','Nhân viên',10,2026,350000.0,5500000.0,27.0,0.0,0.0,910000.0,300000.0,200000.0,0.0,1410000.0,0.0,0.0,0.0,577500.0,0.0,0.0,0.0,832500.0,'Bản nháp',0,'','2026-10-19 08:34:37');
INSERT INTO monthly_payrolls VALUES(293,2125,'DCD-20261015-2588-FL9B','Nguyễn Quý Dương','Bộ phận sản xuất','Quản đốc sản xuất',10,2026,750000.0,5500000.0,27.0,0.0,0.0,910000.0,300000.0,200000.0,0.0,1410000.0,0.0,0.0,0.0,577500.0,0.0,0.0,0.0,832500.0,'Bản nháp',0,'','2026-10-19 08:34:37');
INSERT INTO monthly_payrolls VALUES(294,2139,'DCD-20261015-8870-NIRH','Nguyễn Thị Tú','Bộ phận sản xuất','Nhân viên',10,2026,350000.0,5500000.0,27.0,0.0,0.0,910000.0,300000.0,200000.0,0.0,1410000.0,0.0,0.0,0.0,577500.0,0.0,0.0,0.0,832500.0,'Bản nháp',0,'','2026-10-19 08:34:37');
INSERT INTO monthly_payrolls VALUES(295,2140,'DCD-20261015-6969-IQLW','Nguyễn Văn Được','Bộ phận sản xuất','Nhân viên',10,2026,350000.0,5500000.0,27.0,0.0,0.0,910000.0,300000.0,200000.0,0.0,1410000.0,0.0,0.0,0.0,577500.0,0.0,0.0,0.0,832500.0,'Bản nháp',0,'','2026-10-19 08:34:37');
INSERT INTO monthly_payrolls VALUES(296,2138,'DCD-20261015-0553-17JM','Nguyễn Văn Khánh','Hội đồng quản trị','Chủ tịch HĐQT',10,2026,350000.0,5500000.0,27.0,0.0,0.0,910000.0,300000.0,200000.0,0.0,1410000.0,0.0,0.0,0.0,577500.0,0.0,0.0,0.0,832500.0,'Bản nháp',0,'','2026-10-19 08:34:37');
CREATE TABLE quotations (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      project_name TEXT,
      contact_person TEXT,
      phone TEXT,
      category TEXT,
      total_value REAL DEFAULT 0,
      created_date TEXT,
      effective_date TEXT,
      creator_name TEXT,
      status TEXT DEFAULT 'draft',
      status_label TEXT DEFAULT 'Dự thảo',
      notes TEXT,
      items_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    , customer_address TEXT, attachment_name TEXT, attachment_size TEXT, attachment_url TEXT, attachments TEXT, tender_code TEXT, customer_multiplier REAL DEFAULT 1.1, total_quantity INTEGER DEFAULT 0, vat_rate REAL DEFAULT 10);
CREATE TABLE contracts (
  id TEXT PRIMARY KEY,
  contract_code TEXT NOT NULL UNIQUE,
  project_name TEXT NOT NULL,
  investor_name TEXT NOT NULL,
  package_scope TEXT,
  contract_value REAL DEFAULT 0,
  disbursed_value REAL DEFAULT 0,
  disbursed_percent REAL DEFAULT 0,
  sign_date TEXT,
  handover_deadline TEXT,
  warranty_months INTEGER DEFAULT 12,
  status TEXT DEFAULT 'active',
  status_label TEXT DEFAULT 'Đang triển khai',
  lead_person TEXT,
  lead_role TEXT,
  bank_guarantee TEXT,
  documents_count INTEGER DEFAULT 0,
  payment_stages_json TEXT,
  history_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
, quotation_code TEXT);
CREATE TABLE debt_receivables (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_address TEXT,
        project_name TEXT,
        contract_value REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        remaining_amount REAL DEFAULT 0,
        due_date TEXT,
        status TEXT DEFAULT 'ontime',
        status_label TEXT DEFAULT 'Trong hạn thanh toán',
        manager_name TEXT,
        notes TEXT,
        entries_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      , customer_id TEXT REFERENCES customers(id));
CREATE TABLE debt_payables (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        supplier_name TEXT NOT NULL,
        supplier_address TEXT,
        po_code TEXT,
        total_amount REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        remaining_amount REAL DEFAULT 0,
        due_date TEXT,
        status TEXT DEFAULT 'pending',
        status_label TEXT DEFAULT 'Chờ thanh toán',
        accountant TEXT,
        notes TEXT,
        entries_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
CREATE TABLE accounting_chart_of_accounts (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      parent_code TEXT,
      nature TEXT DEFAULT 'DEBIT',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
INSERT INTO accounting_chart_of_accounts VALUES('1111','Tiền Việt Nam (Tiền mặt quỹ)',2,'111','DEBIT',1,'2026-10-14 16:13:35');
INSERT INTO accounting_chart_of_accounts VALUES('1121','Tiền gửi ngân hàng (VND - Vietcombank)',2,'112','DEBIT',1,'2026-10-14 16:13:35');
INSERT INTO accounting_chart_of_accounts VALUES('131','Phải thu của khách hàng',1,NULL,'BOTH',1,'2026-10-14 16:13:35');
INSERT INTO accounting_chart_of_accounts VALUES('1331','Thuế GTGT đầu vào được khấu trừ',2,'133','DEBIT',1,'2026-10-14 16:13:35');
INSERT INTO accounting_chart_of_accounts VALUES('141','Tạm ứng nhân viên',1,NULL,'DEBIT',1,'2026-10-14 16:13:35');
INSERT INTO accounting_chart_of_accounts VALUES('1521','Nguyên liệu, vật liệu chính (Gỗ sấy, phôi)',2,'152','DEBIT',1,'2026-10-14 16:13:35');
INSERT INTO accounting_chart_of_accounts VALUES('1522','Vật liệu phụ, phụ kiện khoá và bản lề',2,'152','DEBIT',1,'2026-10-14 16:13:35');
INSERT INTO accounting_chart_of_accounts VALUES('154','Chi phí sản xuất kinh doanh dở dang',1,NULL,'DEBIT',1,'2026-10-14 16:13:35');
INSERT INTO accounting_chart_of_accounts VALUES('155','Thành phẩm cửa gỗ xây dựng',1,NULL,'DEBIT',1,'2026-10-14 16:13:35');
INSERT INTO accounting_chart_of_accounts VALUES('211','Tài sản cố định hữu hình (Máy móc CNC)',1,NULL,'DEBIT',1,'2026-10-14 16:13:35');
INSERT INTO accounting_chart_of_accounts VALUES('2141','Hao mòn tài sản cố định hữu hình',2,'214','CREDIT',1,'2026-10-14 16:13:35');
INSERT INTO accounting_chart_of_accounts VALUES('331','Phải trả cho người bán (Nhà cung cấp)',1,NULL,'BOTH',1,'2026-10-14 16:13:35');
INSERT INTO accounting_chart_of_accounts VALUES('3331','Thuế GTGT đầu ra phải nộp',2,'333','CREDIT',1,'2026-10-14 16:13:35');
INSERT INTO accounting_chart_of_accounts VALUES('334','Phải trả người lao động (Tiền lương)',1,NULL,'CREDIT',1,'2026-10-14 16:13:35');
INSERT INTO accounting_chart_of_accounts VALUES('338','Phải trả, phải nộp khác',1,NULL,'CREDIT',1,'2026-10-14 16:13:35');
INSERT INTO accounting_chart_of_accounts VALUES('5112','Doanh thu bán thành phẩm cửa',2,'511','CREDIT',1,'2026-10-14 16:13:35');
INSERT INTO accounting_chart_of_accounts VALUES('621','Chi phí nguyên liệu, vật liệu trực tiếp',1,NULL,'DEBIT',1,'2026-10-14 16:13:35');
INSERT INTO accounting_chart_of_accounts VALUES('622','Chi phí nhân công trực tiếp xưởng',1,NULL,'DEBIT',1,'2026-10-14 16:13:35');
INSERT INTO accounting_chart_of_accounts VALUES('627','Chi phí sản xuất chung',1,NULL,'DEBIT',1,'2026-10-14 16:13:35');
INSERT INTO accounting_chart_of_accounts VALUES('632','Giá vốn hàng bán',1,NULL,'DEBIT',1,'2026-10-14 16:13:35');
INSERT INTO accounting_chart_of_accounts VALUES('641','Chi phí bán hàng và vận chuyển',1,NULL,'DEBIT',1,'2026-10-14 16:13:35');
INSERT INTO accounting_chart_of_accounts VALUES('642','Chi phí quản lý doanh nghiệp',1,NULL,'DEBIT',1,'2026-10-14 16:13:35');
INSERT INTO accounting_chart_of_accounts VALUES('811','Chi phí khác',1,NULL,'DEBIT',1,'2026-10-14 16:13:35');
INSERT INTO accounting_chart_of_accounts VALUES('911','Xác định kết quả kinh doanh',1,NULL,'BOTH',1,'2026-10-14 16:13:35');
INSERT INTO accounting_chart_of_accounts VALUES('635','Chi phí tài chính (Lãi vay và phí ngân hàng)',1,NULL,'DEBIT',1,'2026-10-14 23:09:34');
INSERT INTO accounting_chart_of_accounts VALUES('4212','Lợi nhuận sau thuế chưa phân phối năm nay',1,NULL,'CREDIT',1,'2026-10-14 23:09:34');
CREATE TABLE accounting_journal_entries (
      id TEXT PRIMARY KEY,
      entry_number TEXT UNIQUE NOT NULL,
      entry_date TEXT NOT NULL,
      document_date TEXT,
      reference_code TEXT,
      source_module TEXT NOT NULL DEFAULT 'MANUAL',
      source_label TEXT,
      description TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'posted',
      status_label TEXT NOT NULL DEFAULT 'Đã ghi sổ',
      created_by TEXT,
      posted_by TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
INSERT INTO accounting_journal_entries VALUES('JE-DEP-2026-01','PKT-KH-2026-01','2026-01-31','2026-01-31','KH-2026-01','PRODUCTION','Khấu hao TSCĐ','Chi phí khấu hao tài sản cố định Tháng 01/2026',170416666.0,'posted','Đã ghi sổ','Hệ thống tự động',NULL,'2026-10-26 05:55:46','2026-10-26 05:55:46');
INSERT INTO accounting_journal_entries VALUES('JE-DEP-2026-02','PKT-KH-2026-02','2026-02-28','2026-02-28','KH-2026-02','PRODUCTION','Khấu hao TSCĐ','Chi phí khấu hao tài sản cố định Tháng 02/2026',170416666.0,'posted','Đã ghi sổ','Hệ thống tự động',NULL,'2026-10-26 05:55:46','2026-10-26 05:55:46');
INSERT INTO accounting_journal_entries VALUES('JE-DEP-2026-03','PKT-KH-2026-03','2026-03-31','2026-03-31','KH-2026-03','PRODUCTION','Khấu hao TSCĐ','Chi phí khấu hao tài sản cố định Tháng 03/2026',170416666.0,'posted','Đã ghi sổ','Hệ thống tự động',NULL,'2026-10-26 05:55:46','2026-10-26 05:55:46');
INSERT INTO accounting_journal_entries VALUES('JE-DEP-2026-04','PKT-KH-2026-04','2026-04-30','2026-04-30','KH-2026-04','PRODUCTION','Khấu hao TSCĐ','Chi phí khấu hao tài sản cố định Tháng 04/2026',170416666.0,'posted','Đã ghi sổ','Hệ thống tự động',NULL,'2026-10-26 05:55:46','2026-10-26 05:55:46');
INSERT INTO accounting_journal_entries VALUES('JE-DEP-2026-05','PKT-KH-2026-05','2026-05-31','2026-05-31','KH-2026-05','PRODUCTION','Khấu hao TSCĐ','Chi phí khấu hao tài sản cố định Tháng 05/2026',170416666.0,'posted','Đã ghi sổ','Hệ thống tự động',NULL,'2026-10-26 05:55:46','2026-10-26 05:55:46');
INSERT INTO accounting_journal_entries VALUES('JE-DEP-2026-06','PKT-KH-2026-06','2026-06-30','2026-06-30','KH-2026-06','PRODUCTION','Khấu hao TSCĐ','Chi phí khấu hao tài sản cố định Tháng 06/2026',170416666.0,'posted','Đã ghi sổ','Hệ thống tự động',NULL,'2026-10-26 05:55:46','2026-10-26 05:55:46');
INSERT INTO accounting_journal_entries VALUES('JE-DEP-2026-07','PKT-KH-2026-07','2026-07-31','2026-07-31','KH-2026-07','PRODUCTION','Khấu hao TSCĐ','Chi phí khấu hao tài sản cố định Tháng 07/2026',170416666.0,'posted','Đã ghi sổ','Hệ thống tự động',NULL,'2026-10-26 05:55:46','2026-10-26 05:55:46');
INSERT INTO accounting_journal_entries VALUES('JE-DEP-2026-08','PKT-KH-2026-08','2026-08-31','2026-08-31','KH-2026-08','PRODUCTION','Khấu hao TSCĐ','Chi phí khấu hao tài sản cố định Tháng 08/2026',170416666.0,'posted','Đã ghi sổ','Hệ thống tự động',NULL,'2026-10-26 05:55:46','2026-10-26 05:55:46');
INSERT INTO accounting_journal_entries VALUES('JE-DEP-2026-09','PKT-KH-2026-09','2026-09-30','2026-09-30','KH-2026-09','PRODUCTION','Khấu hao TSCĐ','Chi phí khấu hao tài sản cố định Tháng 09/2026',170416666.0,'posted','Đã ghi sổ','Hệ thống tự động',NULL,'2026-10-26 05:55:46','2026-10-26 05:55:46');
INSERT INTO accounting_journal_entries VALUES('JE-DEP-2026-10','PKT-KH-2026-10','2026-10-31','2026-10-31','KH-2026-10','PRODUCTION','Khấu hao TSCĐ','Chi phí khấu hao tài sản cố định Tháng 10/2026',170416666.0,'posted','Đã ghi sổ','Hệ thống tự động',NULL,'2026-10-26 05:55:46','2026-10-26 05:55:46');
CREATE TABLE accounting_journal_lines (
      id TEXT PRIMARY KEY,
      entry_id TEXT NOT NULL,
      line_number INTEGER NOT NULL DEFAULT 1,
      account_id TEXT NOT NULL,
      account_code TEXT NOT NULL,
      account_name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'DEBIT' hoặc 'CREDIT'
      amount REAL NOT NULL DEFAULT 0,
      description TEXT,
      partner TEXT,
      partner_type TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY(entry_id) REFERENCES accounting_journal_entries(id) ON DELETE CASCADE
    );
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-01-L1','JE-DEP-2026-01',1,'627','627','Chi phí sản xuất chung (Khấu hao máy móc xưởng SX)','DEBIT',139833333.0,'Trích khấu hao máy móc CNC, dây chuyền sản xuất Tháng 01/2026','Khối Sản Xuất',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-01-L2','JE-DEP-2026-01',2,'641','641','Chi phí bán hàng và vận chuyển (Khấu hao xe cộ)','DEBIT',22833333.0,'Trích khấu hao xe tải vận chuyển, bàn giao công trình Tháng 01/2026','Phòng Kinh Doanh',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-01-L3','JE-DEP-2026-01',3,'642','642','Chi phí quản lý doanh nghiệp (Khấu hao VP & ERP)','DEBIT',7750000.0,'Trích khấu hao thiết bị văn phòng, bản quyền ERP Tháng 01/2026','Khối Điều Hành',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-01-L4','JE-DEP-2026-01',4,'2141','2141','Hao mòn tài sản cố định hữu hình','CREDIT',170416666.0,'Trích khấu hao lũy kế 12 TSCĐ Tháng 01/2026','Deco Door Enterprise',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-02-L1','JE-DEP-2026-02',1,'627','627','Chi phí sản xuất chung (Khấu hao máy móc xưởng SX)','DEBIT',139833333.0,'Trích khấu hao máy móc CNC, dây chuyền sản xuất Tháng 02/2026','Khối Sản Xuất',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-02-L2','JE-DEP-2026-02',2,'641','641','Chi phí bán hàng và vận chuyển (Khấu hao xe cộ)','DEBIT',22833333.0,'Trích khấu hao xe tải vận chuyển, bàn giao công trình Tháng 02/2026','Phòng Kinh Doanh',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-02-L3','JE-DEP-2026-02',3,'642','642','Chi phí quản lý doanh nghiệp (Khấu hao VP & ERP)','DEBIT',7750000.0,'Trích khấu hao thiết bị văn phòng, bản quyền ERP Tháng 02/2026','Khối Điều Hành',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-02-L4','JE-DEP-2026-02',4,'2141','2141','Hao mòn tài sản cố định hữu hình','CREDIT',170416666.0,'Trích khấu hao lũy kế 12 TSCĐ Tháng 02/2026','Deco Door Enterprise',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-03-L1','JE-DEP-2026-03',1,'627','627','Chi phí sản xuất chung (Khấu hao máy móc xưởng SX)','DEBIT',139833333.0,'Trích khấu hao máy móc CNC, dây chuyền sản xuất Tháng 03/2026','Khối Sản Xuất',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-03-L2','JE-DEP-2026-03',2,'641','641','Chi phí bán hàng và vận chuyển (Khấu hao xe cộ)','DEBIT',22833333.0,'Trích khấu hao xe tải vận chuyển, bàn giao công trình Tháng 03/2026','Phòng Kinh Doanh',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-03-L3','JE-DEP-2026-03',3,'642','642','Chi phí quản lý doanh nghiệp (Khấu hao VP & ERP)','DEBIT',7750000.0,'Trích khấu hao thiết bị văn phòng, bản quyền ERP Tháng 03/2026','Khối Điều Hành',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-03-L4','JE-DEP-2026-03',4,'2141','2141','Hao mòn tài sản cố định hữu hình','CREDIT',170416666.0,'Trích khấu hao lũy kế 12 TSCĐ Tháng 03/2026','Deco Door Enterprise',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-04-L1','JE-DEP-2026-04',1,'627','627','Chi phí sản xuất chung (Khấu hao máy móc xưởng SX)','DEBIT',139833333.0,'Trích khấu hao máy móc CNC, dây chuyền sản xuất Tháng 04/2026','Khối Sản Xuất',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-04-L2','JE-DEP-2026-04',2,'641','641','Chi phí bán hàng và vận chuyển (Khấu hao xe cộ)','DEBIT',22833333.0,'Trích khấu hao xe tải vận chuyển, bàn giao công trình Tháng 04/2026','Phòng Kinh Doanh',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-04-L3','JE-DEP-2026-04',3,'642','642','Chi phí quản lý doanh nghiệp (Khấu hao VP & ERP)','DEBIT',7750000.0,'Trích khấu hao thiết bị văn phòng, bản quyền ERP Tháng 04/2026','Khối Điều Hành',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-04-L4','JE-DEP-2026-04',4,'2141','2141','Hao mòn tài sản cố định hữu hình','CREDIT',170416666.0,'Trích khấu hao lũy kế 12 TSCĐ Tháng 04/2026','Deco Door Enterprise',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-05-L1','JE-DEP-2026-05',1,'627','627','Chi phí sản xuất chung (Khấu hao máy móc xưởng SX)','DEBIT',139833333.0,'Trích khấu hao máy móc CNC, dây chuyền sản xuất Tháng 05/2026','Khối Sản Xuất',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-05-L2','JE-DEP-2026-05',2,'641','641','Chi phí bán hàng và vận chuyển (Khấu hao xe cộ)','DEBIT',22833333.0,'Trích khấu hao xe tải vận chuyển, bàn giao công trình Tháng 05/2026','Phòng Kinh Doanh',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-05-L3','JE-DEP-2026-05',3,'642','642','Chi phí quản lý doanh nghiệp (Khấu hao VP & ERP)','DEBIT',7750000.0,'Trích khấu hao thiết bị văn phòng, bản quyền ERP Tháng 05/2026','Khối Điều Hành',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-05-L4','JE-DEP-2026-05',4,'2141','2141','Hao mòn tài sản cố định hữu hình','CREDIT',170416666.0,'Trích khấu hao lũy kế 12 TSCĐ Tháng 05/2026','Deco Door Enterprise',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-06-L1','JE-DEP-2026-06',1,'627','627','Chi phí sản xuất chung (Khấu hao máy móc xưởng SX)','DEBIT',139833333.0,'Trích khấu hao máy móc CNC, dây chuyền sản xuất Tháng 06/2026','Khối Sản Xuất',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-06-L2','JE-DEP-2026-06',2,'641','641','Chi phí bán hàng và vận chuyển (Khấu hao xe cộ)','DEBIT',22833333.0,'Trích khấu hao xe tải vận chuyển, bàn giao công trình Tháng 06/2026','Phòng Kinh Doanh',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-06-L3','JE-DEP-2026-06',3,'642','642','Chi phí quản lý doanh nghiệp (Khấu hao VP & ERP)','DEBIT',7750000.0,'Trích khấu hao thiết bị văn phòng, bản quyền ERP Tháng 06/2026','Khối Điều Hành',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-06-L4','JE-DEP-2026-06',4,'2141','2141','Hao mòn tài sản cố định hữu hình','CREDIT',170416666.0,'Trích khấu hao lũy kế 12 TSCĐ Tháng 06/2026','Deco Door Enterprise',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-07-L1','JE-DEP-2026-07',1,'627','627','Chi phí sản xuất chung (Khấu hao máy móc xưởng SX)','DEBIT',139833333.0,'Trích khấu hao máy móc CNC, dây chuyền sản xuất Tháng 07/2026','Khối Sản Xuất',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-07-L2','JE-DEP-2026-07',2,'641','641','Chi phí bán hàng và vận chuyển (Khấu hao xe cộ)','DEBIT',22833333.0,'Trích khấu hao xe tải vận chuyển, bàn giao công trình Tháng 07/2026','Phòng Kinh Doanh',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-07-L3','JE-DEP-2026-07',3,'642','642','Chi phí quản lý doanh nghiệp (Khấu hao VP & ERP)','DEBIT',7750000.0,'Trích khấu hao thiết bị văn phòng, bản quyền ERP Tháng 07/2026','Khối Điều Hành',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-07-L4','JE-DEP-2026-07',4,'2141','2141','Hao mòn tài sản cố định hữu hình','CREDIT',170416666.0,'Trích khấu hao lũy kế 12 TSCĐ Tháng 07/2026','Deco Door Enterprise',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-08-L1','JE-DEP-2026-08',1,'627','627','Chi phí sản xuất chung (Khấu hao máy móc xưởng SX)','DEBIT',139833333.0,'Trích khấu hao máy móc CNC, dây chuyền sản xuất Tháng 08/2026','Khối Sản Xuất',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-08-L2','JE-DEP-2026-08',2,'641','641','Chi phí bán hàng và vận chuyển (Khấu hao xe cộ)','DEBIT',22833333.0,'Trích khấu hao xe tải vận chuyển, bàn giao công trình Tháng 08/2026','Phòng Kinh Doanh',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-08-L3','JE-DEP-2026-08',3,'642','642','Chi phí quản lý doanh nghiệp (Khấu hao VP & ERP)','DEBIT',7750000.0,'Trích khấu hao thiết bị văn phòng, bản quyền ERP Tháng 08/2026','Khối Điều Hành',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-08-L4','JE-DEP-2026-08',4,'2141','2141','Hao mòn tài sản cố định hữu hình','CREDIT',170416666.0,'Trích khấu hao lũy kế 12 TSCĐ Tháng 08/2026','Deco Door Enterprise',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-09-L1','JE-DEP-2026-09',1,'627','627','Chi phí sản xuất chung (Khấu hao máy móc xưởng SX)','DEBIT',139833333.0,'Trích khấu hao máy móc CNC, dây chuyền sản xuất Tháng 09/2026','Khối Sản Xuất',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-09-L2','JE-DEP-2026-09',2,'641','641','Chi phí bán hàng và vận chuyển (Khấu hao xe cộ)','DEBIT',22833333.0,'Trích khấu hao xe tải vận chuyển, bàn giao công trình Tháng 09/2026','Phòng Kinh Doanh',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-09-L3','JE-DEP-2026-09',3,'642','642','Chi phí quản lý doanh nghiệp (Khấu hao VP & ERP)','DEBIT',7750000.0,'Trích khấu hao thiết bị văn phòng, bản quyền ERP Tháng 09/2026','Khối Điều Hành',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-09-L4','JE-DEP-2026-09',4,'2141','2141','Hao mòn tài sản cố định hữu hình','CREDIT',170416666.0,'Trích khấu hao lũy kế 12 TSCĐ Tháng 09/2026','Deco Door Enterprise',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-10-L1','JE-DEP-2026-10',1,'627','627','Chi phí sản xuất chung (Khấu hao máy móc xưởng SX)','DEBIT',139833333.0,'Trích khấu hao máy móc CNC, dây chuyền sản xuất Tháng 10/2026','Khối Sản Xuất',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-10-L2','JE-DEP-2026-10',2,'641','641','Chi phí bán hàng và vận chuyển (Khấu hao xe cộ)','DEBIT',22833333.0,'Trích khấu hao xe tải vận chuyển, bàn giao công trình Tháng 10/2026','Phòng Kinh Doanh',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-10-L3','JE-DEP-2026-10',3,'642','642','Chi phí quản lý doanh nghiệp (Khấu hao VP & ERP)','DEBIT',7750000.0,'Trích khấu hao thiết bị văn phòng, bản quyền ERP Tháng 10/2026','Khối Điều Hành',NULL,'2026-10-26 05:55:46');
INSERT INTO accounting_journal_lines VALUES('JE-DEP-2026-10-L4','JE-DEP-2026-10',4,'2141','2141','Hao mòn tài sản cố định hữu hình','CREDIT',170416666.0,'Trích khấu hao lũy kế 12 TSCĐ Tháng 10/2026','Deco Door Enterprise',NULL,'2026-10-26 05:55:46');
CREATE TABLE accounting_opening_balances (
      id TEXT PRIMARY KEY,
      period TEXT NOT NULL, -- '2026-10'
      account_code TEXT NOT NULL,
      opening_debit REAL DEFAULT 0,
      opening_credit REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      UNIQUE(period, account_code)
    );
CREATE TABLE bank_loan_repayments (
      id TEXT PRIMARY KEY,
      loan_id TEXT NOT NULL,
      repayment_code TEXT,
      repayment_date TEXT NOT NULL,
      principal_amount REAL NOT NULL DEFAULT 0,
      interest_amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT DEFAULT 'Chuyển khoản VCB',
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(loan_id) REFERENCES bank_loans(id) ON DELETE CASCADE
    );
CREATE TABLE financial_expenses (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'production', -- 'production', 'sales', 'administrative', 'finance'
      category_label TEXT NOT NULL DEFAULT 'Chi phí sản xuất',
      amount REAL NOT NULL DEFAULT 0,
      department TEXT NOT NULL DEFAULT 'Khối Sản Xuất',
      spend_date TEXT NOT NULL,
      spender TEXT,
      status TEXT DEFAULT 'approved',
      status_label TEXT DEFAULT 'Đã chi tiền',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    , debit_account TEXT, debit_account_name TEXT, credit_account TEXT, credit_account_name TEXT, operation_type TEXT, proposer TEXT);
CREATE TABLE fixed_assets (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'machinery',
      category_label TEXT,
      original_price REAL NOT NULL DEFAULT 0,
      residual_value REAL NOT NULL DEFAULT 0,
      accumulated_depreciation REAL NOT NULL DEFAULT 0,
      department TEXT NOT NULL,
      department_key TEXT,
      manager_name TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      status_label TEXT NOT NULL DEFAULT 'Đang sử dụng',
      serial_number TEXT,
      purchased_date TEXT,
      depreciation_months INTEGER DEFAULT 60,
      depreciation_start_date TEXT,
      maintenance_cycle TEXT,
      warranty_expire_date TEXT,
      notes TEXT,
      account_code TEXT DEFAULT '211',
      depreciation_account_code TEXT DEFAULT '2141',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
INSERT INTO fixed_assets VALUES('TS-001','MAY-CNC-01','Máy cắt phay gỗ CNC trung tâm 4 trục tự động','machinery','Máy móc thiết bị sản xuất',1850000000.0,1380000000.0,470000000.0,'Bộ phận sản xuất','production','Trần Văn Mạnh','active','Đang sử dụng','SN-CNC-2024-09','15/03/2024',60,NULL,NULL,NULL,'Phục vụ cắt phôi cửa gỗ chống cháy chính xác cao','211','2141','2026-10-23 05:33:12','2026-10-23 05:33:12');
INSERT INTO fixed_assets VALUES('TS-002','EP-THUY-01','Máy ép nhiệt thủy lực cửa gỗ chống cháy 120 tấn','machinery','Máy móc thiết bị sản xuất',2400000000.0,1920000000.0,480000000.0,'Bộ phận sản xuất','production','Nguyễn Văn Đạt','active','Đang sử dụng','EP-TL-120T-08','10/01/2024',60,NULL,NULL,NULL,'Ép nhiệt dán tấm chống cháy và bề mặt Melamine','211','2141','2026-10-23 05:33:12','2026-10-23 05:33:12');
INSERT INTO fixed_assets VALUES('TS-003','XNANG-KM-01','Xe nâng điện ngồi lái Komatsu 2.5 tấn','vehicle','Phương tiện vận tải',480000000.0,310000000.0,170000000.0,'Bộ phận kho vận','logistics','Vũ Đức Thịnh','active','Đang sử dụng','KM-FB25-9921','22/05/2023',60,NULL,NULL,NULL,'Nâng hạ phôi gỗ và bốc dỡ kiện hàng xuất khẩu','211','2141','2026-10-23 05:33:12','2026-10-23 05:33:12');
INSERT INTO fixed_assets VALUES('TS-004','XTAI-ISU-01','Xe tải thùng kín Isuzu Forward 5 tấn chuyên dụng','vehicle','Phương tiện vận tải',890000000.0,560000000.0,330000000.0,'Bộ phận kho vận','logistics','Lê Hữu Tuấn','active','Đang sử dụng','29H-882.91','18/11/2022',60,NULL,NULL,NULL,'Giao hàng thành phẩm cửa cho các công trình miền Bắc','211','2141','2026-10-23 05:33:12','2026-10-23 05:33:12');
INSERT INTO fixed_assets VALUES('TS-005','SRV-DECO-01','Hệ thống máy chủ Dell PowerEdge R750 lưu trữ ERP','it_office','Thiết bị văn phòng và CNTT',320000000.0,210000000.0,110000000.0,'Phòng hành chính nhân sự','admin','Đặng Minh Quân','active','Đang sử dụng','SRV-DELL-R750-VN','05/08/2023',60,NULL,NULL,NULL,'Đặt tại phòng Server trung tâm tòa nhà điều hành','211','2141','2026-10-23 05:33:12','2026-10-23 05:33:12');
INSERT INTO fixed_assets VALUES('TS-006','DC-SON-01','Dây chuyền sơn tĩnh điện sấy hồng ngoại liên hoàn','machinery','Máy móc thiết bị sản xuất',1650000000.0,980000000.0,670000000.0,'Bộ phận sản xuất','production','Hoàng Văn Sơn','maintenance','Đang bảo dưỡng','SN-LINE-PAINT-02','12/04/2022',60,NULL,NULL,NULL,'Đang bảo dưỡng định kỳ buồng phun và hệ thống sấy','211','2141','2026-10-23 05:33:12','2026-10-23 05:33:12');
INSERT INTO fixed_assets VALUES('TS-007','DAN-CANH-01','Máy dán cạnh vát tự động đa chức năng Felder','machinery','Máy móc thiết bị sản xuất',780000000.0,520000000.0,260000000.0,'Bộ phận sản xuất','production','Trịnh Quốc Bảo','active','Đang sử dụng','FL-G360-8802','19/09/2023',60,NULL,NULL,NULL,'Dán chỉ nẹp cạnh chống ẩm cho cánh cửa và khung bao','211','2141','2026-10-23 05:33:12','2026-10-23 05:33:12');
INSERT INTO fixed_assets VALUES('TS-008','TBIEN-AP-01','Trạm biến áp hạ thế 560kVA trọn bộ nhà máy','workshop','Nhà xưởng và Công trình',1150000000.0,910000000.0,240000000.0,'Bộ phận sản xuất','production','Kỹ sư điện nhà máy','active','Đang sử dụng','TBA-THACHTHAT-560','02/06/2022',60,NULL,NULL,NULL,'Cung cấp nguồn điện 3 pha sản xuất công suất lớn','211','2141','2026-10-23 05:33:12','2026-10-23 05:33:12');
INSERT INTO fixed_assets VALUES('TS-009','MLANH-VRV-01','Hệ thống điều hòa trung tâm VRV Daikin văn phòng','workshop','Nhà xưởng và Công trình',420000000.0,270000000.0,150000000.0,'Phòng hành chính nhân sự','admin','Quản trị tòa nhà','active','Đang sử dụng','DK-VRV-IV-60HP','28/02/2023',60,NULL,NULL,NULL,'Điều hòa thông gió khối văn phòng điều hành','211','2141','2026-10-23 05:33:12','2026-10-23 05:33:12');
INSERT INTO fixed_assets VALUES('TS-010','DO-AM-01','Máy đo độ ẩm gỗ điện tử tự động Delmhorst','measuring','Thiết bị đo kiểm chất lượng',65000000.0,42000000.0,23000000.0,'Bộ phận sản xuất','production','Trưởng phòng KCS','active','Đang sử dụng','DMH-J2000-019','11/10/2023',60,NULL,NULL,NULL,'Đo kiểm độ ẩm cốt gỗ trước khi đưa vào dây chuyền ép','211','2141','2026-10-23 05:33:12','2026-10-23 05:33:12');
INSERT INTO fixed_assets VALUES('TS-011','PC-DESIGN-01','Dàn máy tính đồ họa chuyên dụng thiết kế 3D Solidworks','it_office','Thiết bị văn phòng và CNTT',145000000.0,88000000.0,57000000.0,'Thiết kế sản xuất','technical','Lê Anh Văn','active','Đang sử dụng','PC-RD-I9-4080','14/07/2023',60,NULL,NULL,NULL,'Phục vụ dựng bản vẽ kỹ thuật chi tiết cửa chống cháy','211','2141','2026-10-23 05:33:12','2026-10-23 05:33:12');
INSERT INTO fixed_assets VALUES('TS-012','KHO-LUU-01','Máy đóng đai kiện hàng tự động khí nén','machinery','Máy móc thiết bị sản xuất',75000000.0,45000000.0,30000000.0,'Bộ phận kho vận','logistics','Thủ kho thành phẩm','in_stock','Trong kho lưu trữ','PKG-STRAP-03','09/12/2023',60,NULL,NULL,NULL,'Máy dự phòng phục vụ đóng gói xuất khẩu','211','2141','2026-10-23 05:33:12','2026-10-23 05:33:12');
CREATE TABLE fixed_asset_depreciations (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      period TEXT NOT NULL, -- YYYY-MM
      depreciation_amount REAL NOT NULL DEFAULT 0,
      residual_value_after REAL NOT NULL DEFAULT 0,
      journal_entry_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(asset_id) REFERENCES fixed_assets(id) ON DELETE CASCADE
    );
CREATE TABLE fixed_asset_maintenances (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      maintenance_date TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      cost REAL NOT NULL DEFAULT 0,
      technician TEXT,
      status TEXT DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(asset_id) REFERENCES fixed_assets(id) ON DELETE CASCADE
    );
CREATE TABLE financial_initial_declarations (
      period TEXT PRIMARY KEY,
      data_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
INSERT INTO financial_initial_declarations VALUES('2026-10','{"cashAndInvestments":{"cashInHand":0,"bankDeposits":0,"bankAccounts":[],"shortTermInvestments":0},"debts":{"customerDebts":[],"customerReceivablesTotal":0,"prepaymentsToSuppliers":0,"otherShortTermReceivables":0,"supplierDebts":[],"supplierPayablesTotal":0,"customerPrepayments":0},"inventory":{"rawMaterials":0,"workInProgress":0,"finishedGoods":0,"inventoryProvision":0,"totalInventory":0},"fixedAssets":{"tangibleOriginal":0,"tangibleDepreciation":0,"tangibleNet":0,"intangibleOriginal":0,"intangibleDepreciation":0,"intangibleNet":0,"constructionInProgress":0,"longTermPrepayments":0,"longTermReceivables":0},"capitalAndLiabilities":{"ownerEquity":0,"developmentFund":0,"retainedEarningsAccumulated":0,"shortTermLoans":0,"longTermLoans":0,"taxPayables":0,"vatDeductible":0,"otherTaxReceivables":0,"employeePayables":0},"totalAssets":0,"totalResources":0,"isBalanced":true}','2026-10-14 18:44:18');
CREATE TABLE cash_and_bank_assets (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'cash' | 'bank' | 'term_deposit'
      account_number TEXT,
      bank_name TEXT,
      branch TEXT,
      balance REAL DEFAULT 0,
      currency TEXT DEFAULT 'VND',
      term_months INTEGER DEFAULT 0,
      interest_rate REAL DEFAULT 0,
      start_date TEXT,
      maturity_date TEXT,
      manager_name TEXT,
      status TEXT DEFAULT 'active', -- 'active' | 'locked'
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
CREATE TABLE IF NOT EXISTS "bank_loans" (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    bank_name TEXT NOT NULL,
    contract_code TEXT,
    facility_type TEXT DEFAULT 'working_capital',
    facility_label TEXT DEFAULT 'Vay vốn lưu động hạn mức',
    term_type TEXT DEFAULT 'short_term',
    loan_limit REAL NOT NULL DEFAULT 0,
    paid_principal REAL NOT NULL DEFAULT 0,
    remaining_principal REAL NOT NULL DEFAULT 0,
    due_within_12m REAL DEFAULT 0,
    interest_rate TEXT NOT NULL DEFAULT '7.5% / năm',
    interest_rate_val REAL DEFAULT 7.5,
    interest_type TEXT DEFAULT 'floating',
    interest_payment_day INTEGER DEFAULT 25,
    monthly_interest_est REAL DEFAULT 0,
    start_date TEXT,
    maturity_date TEXT,
    collateral_asset_id TEXT,
    collateral_name TEXT,
    collateral_value REAL DEFAULT 0,
    bank_account_id TEXT,
    bank_account_number TEXT,
    status TEXT DEFAULT 'active',
    status_label TEXT DEFAULT 'Dư nợ trong hạn',
    loan_type TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
CREATE TABLE bank_loan_drawdowns (
    id TEXT PRIMARY KEY,
    loan_id TEXT NOT NULL,
    drawdown_code TEXT NOT NULL,
    drawdown_date TEXT NOT NULL,
    maturity_date TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    paid_principal REAL NOT NULL DEFAULT 0,
    remaining_principal REAL NOT NULL DEFAULT 0,
    interest_rate REAL DEFAULT 7.5,
    purpose TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(loan_id) REFERENCES "bank_loans"(id) ON DELETE CASCADE
  );
CREATE TABLE advance_payments (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      employee_name TEXT NOT NULL,
      employee_code TEXT,
      department TEXT,
      purpose TEXT NOT NULL,
      project TEXT,
      amount REAL NOT NULL DEFAULT 0,
      requested_date TEXT,
      payment_method TEXT DEFAULT 'bank_transfer',
      bank_name TEXT,
      bank_account TEXT,
      bank_account_name TEXT,
      status TEXT DEFAULT 'pending',
      review_status TEXT DEFAULT 'unprocessed',
      approver TEXT,
      approved_date TEXT,
      reject_reason TEXT,
      rejected_date TEXT,
      deadline_refund TEXT,
      note TEXT,
      attached_docs_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
CREATE TABLE advance_settlements (
      id TEXT PRIMARY KEY,
      advance_id TEXT,
      advance_code TEXT NOT NULL,
      settlement_code TEXT,
      employee_name TEXT NOT NULL,
      employee_code TEXT,
      department TEXT,
      purpose TEXT,
      project TEXT,
      advance_amount REAL NOT NULL DEFAULT 0,
      approved_date TEXT,
      approver TEXT,
      deadline_refund TEXT,
      settlement_date TEXT,
      actual_spent REAL NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'unsettled',
      invoices TEXT DEFAULT '[]',
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
CREATE TABLE financial_vouchers (
      id TEXT PRIMARY KEY,
      voucher_code TEXT UNIQUE NOT NULL,
      voucher_type TEXT NOT NULL,
      date TEXT NOT NULL,
      partner_type TEXT DEFAULT 'customer',
      partner_name TEXT NOT NULL,
      partner_code TEXT,
      payer_receiver_name TEXT,
      address TEXT,
      phone TEXT,
      amount REAL NOT NULL DEFAULT 0,
      amount_in_words TEXT,
      reason TEXT,
      payment_method TEXT DEFAULT 'Chuyển khoản',
      debit_account TEXT DEFAULT '1121',
      credit_account TEXT DEFAULT '131',
      reference_code TEXT,
      stage_title TEXT,
      notes TEXT,
      creator TEXT,
      accountant TEXT,
      cashier TEXT,
      director TEXT,
      has_stamp INTEGER DEFAULT 1,
      status TEXT DEFAULT 'completed',
      metadata_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
CREATE TABLE payment_orders (
  id TEXT PRIMARY KEY,
  order_code TEXT UNIQUE NOT NULL,
  ref_type TEXT DEFAULT 'advance',
  ref_id TEXT,
  ref_code TEXT,
  title TEXT NOT NULL,
  beneficiary_name TEXT NOT NULL,
  beneficiary_code TEXT,
  department TEXT,
  amount REAL NOT NULL DEFAULT 0,
  amount_in_words TEXT,
  payment_method TEXT DEFAULT 'bank_transfer',
  bank_name TEXT,
  bank_account TEXT,
  bank_branch TEXT,
  purpose TEXT,
  due_date TEXT,
  approved_by TEXT,
  approved_date TEXT,
  approval_note TEXT,
  status TEXT DEFAULT 'pending',
  status_label TEXT DEFAULT 'Chờ chi tiền',
  executed_by TEXT,
  executed_date TEXT,
  voucher_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
COMMIT;
