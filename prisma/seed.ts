import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Outlet
  const outlet = await prisma.outlet.upsert({
    where: { id: 'outlet-1' },
    update: {},
    create: {
      id: 'outlet-1',
      name: 'RestoPOS Demo',
      address: 'Kampala, Uganda',
      phone: '+256 700 000000',
      currency: 'UGX',
    },
  })

  // Super Admin (Bryan - manages all restaurants)
  const superHash = await bcrypt.hash('superadmin123', 10)
  await prisma.user.upsert({
    where: { email: 'super@restopos.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'super@restopos.com',
      passwordHash: superHash,
      role: 'SUPER_ADMIN',
      outletId: outlet.id,
      pin: '0000',
    },
  })

  // Admin user
  const adminHash = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@restopos.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@restopos.com',
      passwordHash: adminHash,
      role: 'ADMIN',
      outletId: outlet.id,
      pin: '1234',
    },
  })

  // Waiter
  await prisma.user.upsert({
    where: { email: 'waiter@restopos.com' },
    update: {},
    create: {
      name: 'John Waiter',
      email: 'waiter@restopos.com',
      passwordHash: await bcrypt.hash('waiter123', 10),
      role: 'WAITER',
      outletId: outlet.id,
      pin: '2222',
    },
  })

  // Cashier
  await prisma.user.upsert({
    where: { email: 'cashier@restopos.com' },
    update: {},
    create: {
      name: 'Mary Cashier',
      email: 'cashier@restopos.com',
      passwordHash: await bcrypt.hash('cashier123', 10),
      role: 'CASHIER',
      outletId: outlet.id,
      pin: '3333',
    },
  })

  // Kitchen staff
  await prisma.user.upsert({
    where: { email: 'kitchen@restopos.com' },
    update: {},
    create: {
      name: 'Chef Kitchen',
      email: 'kitchen@restopos.com',
      passwordHash: await bcrypt.hash('kitchen123', 10),
      role: 'KITCHEN_STAFF',
      outletId: outlet.id,
      pin: '4444',
    },
  })

  // Menu categories
  const food = await prisma.menuCategory.upsert({
    where: { id: 'cat-food' },
    update: {},
    create: { id: 'cat-food', name: 'Food', sortOrder: 1 },
  })
  const drinks = await prisma.menuCategory.upsert({
    where: { id: 'cat-drinks' },
    update: {},
    create: { id: 'cat-drinks', name: 'Drinks', sortOrder: 2 },
  })
  const specials = await prisma.menuCategory.upsert({
    where: { id: 'cat-specials' },
    update: {},
    create: { id: 'cat-specials', name: 'Specials', sortOrder: 3 },
  })

  // Menu items
  const menuItems = [
    { id: 'item-1', name: 'Rolex',          price: 5000,  categoryId: food.id },
    { id: 'item-2', name: 'Chips',           price: 8000,  categoryId: food.id },
    { id: 'item-3', name: 'Grilled Chicken', price: 25000, categoryId: food.id },
    { id: 'item-4', name: 'Beef Stew',       price: 18000, categoryId: food.id },
    { id: 'item-5', name: 'Fish & Chips',    price: 22000, categoryId: food.id },
    { id: 'item-6', name: 'Matoke',          price: 10000, categoryId: food.id },
    { id: 'item-7', name: 'Soda',            price: 3000,  categoryId: drinks.id },
    { id: 'item-8', name: 'Water',           price: 1500,  categoryId: drinks.id },
    { id: 'item-9', name: 'Fresh Juice',     price: 6000,  categoryId: drinks.id },
    { id: 'item-10',name: 'Beer',            price: 7000,  categoryId: drinks.id },
    { id: 'item-11',name: 'Special Burger',  price: 35000, categoryId: specials.id },
    { id: 'item-12',name: 'Chef\'s Pasta',   price: 28000, categoryId: specials.id },
  ]

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    })
  }

  // Floor & Tables
  const floor = await prisma.floor.upsert({
    where: { id: 'floor-1' },
    update: {},
    create: { id: 'floor-1', name: 'Main Floor', outletId: outlet.id },
  })

  const tables = [
    { id: 'table-1', name: 'T1', capacity: 2 },
    { id: 'table-2', name: 'T2', capacity: 4 },
    { id: 'table-3', name: 'T3', capacity: 4 },
    { id: 'table-4', name: 'T4', capacity: 6 },
    { id: 'table-5', name: 'T5', capacity: 2 },
    { id: 'table-6', name: 'T6', capacity: 8 },
    { id: 'table-7', name: 'VIP1', capacity: 4 },
    { id: 'table-8', name: 'VIP2', capacity: 6 },
  ]

  for (const t of tables) {
    await prisma.table.upsert({
      where: { id: t.id },
      update: {},
      create: { ...t, floorId: floor.id },
    })
  }

  console.log('✅ Seed complete!')
  console.log('')
  console.log('Demo login credentials:')
  console.log('  Admin:   admin@restopos.com / admin123  (PIN: 1234)')
  console.log('  Waiter:  waiter@restopos.com / waiter123 (PIN: 2222)')
  console.log('  Cashier: cashier@restopos.com / cashier123 (PIN: 3333)')
  console.log('  Kitchen: kitchen@restopos.com / kitchen123 (PIN: 4444)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
