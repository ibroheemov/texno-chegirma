import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.creditPayment.deleteMany();
  await prisma.creditLedger.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.store.deleteMany();

  const store = await prisma.store.create({
    data: { name: "Namuna Do'kon", currency: "so'm" },
  });

  const passwordHash = await bcrypt.hash("demo1234", 10);
  await prisma.user.create({
    data: {
      storeId: store.id,
      name: "Admin",
      login: "demo",
      password: passwordHash,
      role: "ADMIN",
    },
  });

  const categoryNames = ["Maishiy texnika", "Asboblar", "Idish-tovoq", "Aksessuarlar"];
  const categories = await Promise.all(
    categoryNames.map((name) => prisma.category.create({ data: { storeId: store.id, name } }))
  );

  const productSeed: Array<[string, string, number, number, number, number]> = [
    ["Dazmol Beltop 3502", "BL3502", 250000, 190000, 4, 3],
    ["Fen Sonifer 9635", "SF9635", 190000, 140000, 2, 3],
    ["Choy termos 9910", "TRM9910", 70000, 48000, 6, 3],
    ["Balgarka Pollwon 950Bt", "PW115125", 330000, 250000, 1, 3],
    ["Konditsioner Avangard 12", "AV12XA", 3400000, 2800000, 1, 2],
    ["Gaz plita Ayuba 2 xonalik", "AYUBA200", 180000, 140000, 6, 0],
    ["Dudburon Shivaki 1160B", "SHIV1160B", 1250000, 980000, 1, 2],
    ["Blender Shisha 2/1", "BL7007", 170000, 120000, 6, 3],
    ["Ariston Pollwon 30L", "PW24030", 1130000, 920000, 1, 2],
    ["Drell Pollwon 550Bt", "PW11010M", 280000, 210000, 1, 3],
  ];

  const products = await Promise.all(
    productSeed.map(([name, sku, price, costPrice, stock, catIdx]) =>
      prisma.product.create({
        data: {
          storeId: store.id,
          categoryId: categories[catIdx].id,
          name,
          sku,
          price,
          costPrice,
          stock,
          lowStockAt: 3,
        },
      })
    )
  );

  const customerSeed: Array<[string, string]> = [
    ["Farxod aka", "+998945075453"],
    ["Doniyor aka", "+998992820007"],
    ["Nodir S", "+998940080078"],
    ["Ismoil", "882549700"],
    ["Obitxon aka", "975002221"],
  ];
  const customers = await Promise.all(
    customerSeed.map(([name, phone]) =>
      prisma.customer.create({ data: { storeId: store.id, name, phone } })
    )
  );

  const now = new Date();
  function daysAgo(n: number) {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d;
  }
  function daysFromNow(n: number) {
    const d = new Date(now);
    d.setDate(d.getDate() + n);
    return d;
  }

  async function makeSale(opts: {
    product: (typeof products)[number];
    qty: number;
    method: "CASH" | "CARD" | "CREDIT" | "MIXED";
    createdAt: Date;
    customerId?: string;
    dueDate?: Date;
    paidAmount?: number;
  }) {
    const total = opts.product.price * opts.qty;
    const profit = (opts.product.price - opts.product.costPrice) * opts.qty;
    const sale = await prisma.sale.create({
      data: {
        storeId: store.id,
        customerId: opts.customerId,
        total,
        profit,
        paymentMethod: opts.method,
        cashAmount: opts.method === "CASH" ? total : opts.method === "MIXED" ? Math.round(total / 2) : 0,
        cardAmount: opts.method === "CARD" ? total : opts.method === "MIXED" ? total - Math.round(total / 2) : 0,
        creditAmount: opts.method === "CREDIT" ? total : 0,
        createdAt: opts.createdAt,
        items: {
          create: [
            {
              productId: opts.product.id,
              name: opts.product.name,
              qty: opts.qty,
              price: opts.product.price,
              costPrice: opts.product.costPrice,
            },
          ],
        },
      },
    });

    if (opts.method !== "CREDIT") {
      await prisma.ledgerEntry.create({
        data: {
          storeId: store.id,
          saleId: sale.id,
          direction: "IN",
          amount: total,
          method: opts.method,
          createdAt: opts.createdAt,
        },
      });
    } else if (opts.customerId && opts.dueDate) {
      await prisma.creditLedger.create({
        data: {
          storeId: store.id,
          saleId: sale.id,
          customerId: opts.customerId,
          totalAmount: total,
          paidAmount: opts.paidAmount ?? 0,
          dueDate: opts.dueDate,
          createdAt: opts.createdAt,
        },
      });
    }
    return sale;
  }

  await makeSale({ product: products[0], qty: 1, method: "CASH", createdAt: daysAgo(0) });
  await makeSale({ product: products[1], qty: 2, method: "CARD", createdAt: daysAgo(0) });
  await makeSale({ product: products[2], qty: 3, method: "CASH", createdAt: daysAgo(1) });
  await makeSale({ product: products[4], qty: 1, method: "CARD", createdAt: daysAgo(2) });
  await makeSale({
    product: products[6],
    qty: 1,
    method: "CREDIT",
    createdAt: daysAgo(10),
    customerId: customers[0].id,
    dueDate: daysAgo(2),
    paidAmount: 250000,
  });
  await makeSale({
    product: products[8],
    qty: 1,
    method: "CREDIT",
    createdAt: daysAgo(6),
    customerId: customers[1].id,
    dueDate: daysFromNow(4),
    paidAmount: 400000,
  });
  await makeSale({
    product: products[3],
    qty: 1,
    method: "CREDIT",
    createdAt: daysAgo(3),
    customerId: customers[2].id,
    dueDate: daysFromNow(10),
    paidAmount: 0,
  });

  await prisma.ledgerEntry.create({
    data: {
      storeId: store.id,
      direction: "OUT",
      amount: 150000,
      method: "CASH",
      note: "Ofis xarajati",
      createdAt: daysAgo(1),
    },
  });

  const employees = await Promise.all(
    [
      ["Jasur Toshmatov", "Sotuvchi", 2500000],
      ["Dilnoza Karimova", "Kassir", 2200000],
    ].map(([name, position, salary]) =>
      prisma.employee.create({
        data: { storeId: store.id, name: name as string, position: position as string, salary: salary as number },
      })
    )
  );

  for (const emp of employees) {
    await prisma.attendance.create({
      data: { employeeId: emp.id, date: daysAgo(0), status: "PRESENT", checkIn: daysAgo(0) },
    });
  }

  console.log("Seed complete. Login: demo / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
