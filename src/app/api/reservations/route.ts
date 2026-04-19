import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuth } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')

    const where: any = {
      outletId: session.user.outletId,
      status: { not: 'CANCELLED' },
    }
    if (date) {
      const start = new Date(date); start.setHours(0,0,0,0)
      const end = new Date(date); end.setHours(23,59,59,999)
      where.reservationDate = { gte: start, lte: end }
    }

    const reservations = await prisma.reservation.findMany({
      where,
      orderBy: { reservationDate: 'asc' },
      include: { table: true, customer: true },
    })
    return NextResponse.json(reservations)
  } catch (e: any) { console.error("Failed to fetch reservations:", e?.message)
    return NextResponse.json({ error: 'Failed to fetch reservations', detail: e?.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()

    const reservation = await prisma.reservation.create({
      data: {
        outletId: session.user.outletId,
        guestName: body.guestName,
        guestPhone: body.guestPhone ?? null,
        guestEmail: body.guestEmail ?? null,
        partySize: body.partySize,
        reservationDate: new Date(body.reservationDate),
        tableId: body.tableId ?? null,
        customerId: body.customerId ?? null,
        notes: body.notes ?? null,
        status: 'BOOKED',
      },
    })

    // Mark table as reserved
    if (body.tableId) {
      await prisma.table.update({
        where: { id: body.tableId },
        data: { status: 'RESERVED' },
      })
    }

    return NextResponse.json(reservation, { status: 201 })
  } catch (e: any) { console.error("Failed to create reservation:", e?.message)
    return NextResponse.json({ error: 'Failed to create reservation', detail: e?.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()

    const reservation = await prisma.reservation.update({
      where: { id: body.id },
      data: { status: body.status },
    })

    // Free table on cancel/no-show/complete
    if (['CANCELLED','NO_SHOW','COMPLETED'].includes(body.status)) {
      const res = await prisma.reservation.findUnique({ where: { id: body.id } })
      if (res?.tableId) {
        await prisma.table.update({
          where: { id: res.tableId },
          data: { status: 'VACANT' },
        })
      }
    }

    return NextResponse.json(reservation)
  } catch (e: any) { console.error("Failed to update reservation:", e?.message)
    return NextResponse.json({ error: 'Failed to update reservation', detail: e?.message }, { status: 500 })
  }
}
