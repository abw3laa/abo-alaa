import type { Metadata } from "next";
import { requireUserOrRedirect } from "@/lib/auth/guard";
import { prisma } from "@/lib/prisma";
import { AddressManager } from "@/components/account/address-manager";

export const metadata: Metadata = { title: "العناوين المحفوظة" };

export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const user = await requireUserOrRedirect();
  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: { isDefault: "desc" },
  });

  return (
    <AddressManager
      addresses={addresses.map((a) => ({
        id: a.id,
        fullName: a.fullName,
        phone: a.phone,
        country: a.country,
        city: a.city,
        state: a.state,
        street: a.street,
        building: a.building,
        postalCode: a.postalCode,
        notes: a.notes,
        isDefault: a.isDefault,
      }))}
    />
  );
}
