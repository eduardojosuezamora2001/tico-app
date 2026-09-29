import { describe, expect, it } from "vitest"

import {
  AddBusinessUserSchema,
  BusinessHoursSchema,
  CreateAddressSchema,
  CreateBusinessSchema,
  CreateEventSchema,
  CreateProductSchema,
  CreateReviewSchema,
  ListAdministrativeDivisionsSchema,
  NearbyBusinessesSchema,
  SearchBusinessesSchema,
  SendMessageSchema,
  SignUpSchema,
  UserSchema,
} from "../schemas.js"

describe("SignUpSchema", () => {
  it("accepts a valid payload", () => {
    const result = SignUpSchema.safeParse({
      email: "ana@example.com",
      password: "supersecreta",
      fullName: "Ana Perez",
    })
    expect(result.success).toBe(true)
  })

  it("rejects short passwords and invalid emails", () => {
    expect(
      SignUpSchema.safeParse({ email: "nope", password: "123", fullName: "x" })
        .success
    ).toBe(false)
  })
})

describe("UserSchema", () => {
  it("only accepts known roles", () => {
    const base = {
      id: "6f1c2b1e-4a0d-4c3e-9e7a-1b2c3d4e5f60",
      email: "ana@example.com",
      fullName: "Ana",
      avatarUrl: null,
      preferredLanguage: "es",
      createdAt: "2026-09-24T14:00:00.000Z",
      updatedAt: "2026-09-24T14:00:00.000Z",
    }
    expect(UserSchema.safeParse({ ...base, role: "client" }).success).toBe(true)
    expect(UserSchema.safeParse({ ...base, role: "superuser" }).success).toBe(
      false
    )
  })
})

describe("CreateBusinessSchema", () => {
  it("validates coordinates and E.164 WhatsApp numbers", () => {
    const ok = CreateBusinessSchema.safeParse({
      name: "Soda La Tica",
      category: "restaurante",
      latitude: 9.9281,
      longitude: -84.0907,
      whatsappNumber: "+50688887777",
    })
    expect(ok.success).toBe(true)

    const badLat = CreateBusinessSchema.safeParse({
      name: "X",
      category: "y",
      latitude: 120,
    })
    expect(badLat.success).toBe(false)

    const localPhone = CreateBusinessSchema.safeParse({
      name: "X",
      category: "y",
      whatsappNumber: "88887777",
    })
    expect(localPhone.success).toBe(true)
    if (localPhone.success) {
      expect(localPhone.data.whatsappNumber).toBe("+50688887777")
    }

    const badPhone = CreateBusinessSchema.safeParse({
      name: "X",
      category: "y",
      whatsappNumber: "12",
    })
    expect(badPhone.success).toBe(false)

    const social = CreateBusinessSchema.safeParse({
      name: "X",
      category: "y",
      facebookUrl: "facebook.com/local",
    })
    expect(social.success).toBe(true)
    if (social.success) {
      expect(social.data.facebookUrl).toBe("https://facebook.com/local")
    }
  })
})

describe("SearchBusinessesSchema", () => {
  it("applies defaults and caps the radius at 50km", () => {
    const parsed = SearchBusinessesSchema.parse({})
    expect(parsed.radiusKm).toBe(10)
    expect(parsed.limit).toBe(20)
    expect(SearchBusinessesSchema.safeParse({ radiusKm: 51 }).success).toBe(false)
  })
})

describe("CreateProductSchema", () => {
  it("requires a positive price with at most 2 decimals", () => {
    expect(
      CreateProductSchema.safeParse({ name: "Cafe", price: 1500 }).success
    ).toBe(true)
    expect(
      CreateProductSchema.safeParse({ name: "Cafe", price: 0 }).success
    ).toBe(false)
    expect(
      CreateProductSchema.safeParse({ name: "Cafe", price: 10.005 }).success
    ).toBe(false)
  })
})

describe("BusinessHoursSchema", () => {
  it("accepts a weekly row and an exception row, but not both", () => {
    expect(
      BusinessHoursSchema.safeParse({
        dayOfWeek: 1,
        exceptionDate: null,
        openTime: "08:00",
        closeTime: "17:00",
        isClosed: false,
      }).success
    ).toBe(true)
    expect(
      BusinessHoursSchema.safeParse({
        dayOfWeek: null,
        exceptionDate: "2026-12-25",
        openTime: null,
        closeTime: null,
        isClosed: true,
      }).success
    ).toBe(true)
    expect(
      BusinessHoursSchema.safeParse({
        dayOfWeek: 1,
        exceptionDate: "2026-12-25",
        openTime: "08:00",
        closeTime: "17:00",
        isClosed: false,
      }).success
    ).toBe(false)
  })
})

describe("AddBusinessUserSchema", () => {
  it("does not allow assigning the owner role or unknown permissions", () => {
    expect(
      AddBusinessUserSchema.safeParse({
        email: "emp@example.com",
        role: "owner",
      }).success
    ).toBe(false)
    expect(
      AddBusinessUserSchema.safeParse({
        email: "emp@example.com",
        role: "employee",
        permissions: ["products:fly"],
      }).success
    ).toBe(false)
    expect(
      AddBusinessUserSchema.safeParse({
        email: "emp@example.com",
        role: "employee",
        permissions: ["products:view", "products:create"],
      }).success
    ).toBe(true)
  })
})

describe("CreateReviewSchema / CreateEventSchema / SendMessageSchema", () => {
  it("enforces rating range", () => {
    expect(CreateReviewSchema.safeParse({ rating: 5 }).success).toBe(true)
    expect(CreateReviewSchema.safeParse({ rating: 6 }).success).toBe(false)
  })

  it("requires endsAt after startsAt", () => {
    expect(
      CreateEventSchema.safeParse({
        title: "Feria",
        startsAt: "2026-10-01T18:00:00.000Z",
        endsAt: "2026-10-01T17:00:00.000Z",
      }).success
    ).toBe(false)
  })

  it("rejects empty messages", () => {
    expect(
      SendMessageSchema.safeParse({
        businessId: "6f1c2b1e-4a0d-4c3e-9e7a-1b2c3d4e5f60",
        text: "   ",
      }).success
    ).toBe(false)
  })
})

describe("CreateAddressSchema", () => {
  const countryId = "c1111111-1111-4111-8111-111111111111"

  it("requires address line and validates coordinates as a pair", () => {
    expect(
      CreateAddressSchema.safeParse({
        countryId,
        addressLine1: "Avenida Central 100",
        latitude: 9.93,
        longitude: -84.08,
      }).success,
    ).toBe(true)

    expect(
      CreateAddressSchema.safeParse({
        countryId,
        addressLine1: "Avenida Central 100",
        latitude: 9.93,
      }).success,
    ).toBe(false)

    expect(
      CreateAddressSchema.safeParse({
        countryId,
        addressLine1: "   ",
      }).success,
    ).toBe(false)
  })

  it("rejects invalid latitude and longitude", () => {
    expect(
      CreateAddressSchema.safeParse({
        countryId,
        addressLine1: "Centro",
        latitude: 120,
        longitude: 10,
      }).success,
    ).toBe(false)
  })
})

describe("ListAdministrativeDivisionsSchema", () => {
  it("normalizes country codes to uppercase", () => {
    const parsed = ListAdministrativeDivisionsSchema.safeParse({ country: "cr" })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.country).toBe("CR")
  })
})

describe("NearbyBusinessesSchema", () => {
  it("defaults radius to 5000 meters", () => {
    const parsed = NearbyBusinessesSchema.safeParse({ lat: 9.93, lng: -84.08 })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.radius).toBe(5000)
  })
})
