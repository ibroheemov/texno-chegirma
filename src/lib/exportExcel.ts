import type { Category, Product } from "@prisma/client";

type ProductRow = Product & { category: Category | null };

export async function exportProductsToExcel(products: ProductRow[]) {
  const XLSX = await import("xlsx");

  const rows = products.map((p) => {
    const images = Array.isArray(p.images) ? (p.images as string[]).filter((u) => typeof u === "string") : [];
    return {
      Nomi: p.name,
      Kategoriya: p.category?.name ?? "",
      "Shtrix kod": p.sku,
      "Barkod narxi (so'm)": p.barcodePrice ?? "",
      "Tan narx (so'm)": p.costPrice,
      "Sotuv narxi (so'm)": p.price,
      "Chegirma qo'llangan": p.onSale ? "Ha" : "Yo'q",
      "Chegirmali narx (so'm)": p.salePrice ?? "",
      Qoldiq: p.stock,
      "O'lchov birligi": p.unit,
      "Kam qoldi chegarasi": p.lowStockAt,
      "Rasmlar soni": images.length,
      "Qo'shilgan sana": new Date(p.createdAt).toLocaleString("en-GB"),
      "Yangilangan sana": new Date(p.updatedAt).toLocaleString("en-GB"),
    };
  });

  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = [
    { wch: 30 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 10 },
    { wch: 14 },
    { wch: 16 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
  ];

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Ombor");

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(book, `ombor-${date}.xlsx`);
}

type CreditRow = {
  totalAmount: number;
  paidAmount: number;
  dueDate: string | Date;
  createdAt: string | Date;
  customer: { name: string; phone: string | null };
};

export async function exportCreditLedgersToExcel(ledgers: CreditRow[]) {
  const XLSX = await import("xlsx");

  const rows = ledgers.map((l) => ({
    Mijoz: l.customer.name,
    Telefon: l.customer.phone ?? "",
    "Jami summa": l.totalAmount,
    "To'langan": l.paidAmount,
    Qoldiq: l.totalAmount - l.paidAmount,
    Sana: new Date(l.createdAt).toLocaleDateString("en-GB"),
    Muddat: new Date(l.dueDate).toLocaleDateString("en-GB"),
  }));

  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = [{ wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Qarzdorlar");

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(book, `qarzdorlar-${date}.xlsx`);
}
