// ====================
// ENUMS
// ====================
export enum RoleType {
    USER = "USER",
    MEMBER = "MEMBER",
    TELLER = "TELLER",
    LOAN_OFFICER = "LOAN_OFFICER",
    CREDIT_COMMITTEE = "CREDIT_COMMITTEE",
    FINANCE_OFFICER = "FINANCE_OFFICER",
    COMPLIANCE_OFFICER = "COMPLIANCE_OFFICER",
    BRANCH_MANAGER = "BRANCH_MANAGER",
    ADMIN = "ADMIN",
    SUPPORT = "SUPPORT",
}

export enum AccountType {
    EPARGNE = "EPARGNE",
    COURANT = "COURANT",
    NDJANGUI = "NDJANGUI",
    CHEQUE = "CHEQUE",
    PLACEMENT = "PLACEMENT",
}

// ====================
// MODELS
// ====================
export interface User {
    id: string
    email: string
    username?: string | null
    password: string
    roleType: RoleType

    profile?: Profile | null
    contacts: EmergencyContact[]
    accounts: Account[]
    jointInfo?: JointAccountInfo | null
    documents?: Document | null

    createdAt: Date
    updatedAt: Date
}

export interface Profile {
    id: string
    userId: string

    user?: User

    firstName?: string | null
    lastName?: string | null
    birthDate?: Date | null
    birthPlace?: string | null
    nationality?: string | null
    resident?: string | null
    ppe?: string | null
    idNumber?: string | null
    idIssuer?: string | null
    idDate?: Date | null
    phone?: string | null
    address?: string | null
    city?: string | null
    profession?: string | null
    employer?: string | null
    maritalStatus?: string | null
    children?: number | null
    salary?: number | null // Prisma Decimal mapped to number here

    signature?: string | null
    termsAccepted?: boolean | null
}

export interface EmergencyContact {
    id: string
    userId: string
    user?: User

    name: string
    phone: string
    email?: string | null
    relation: string
}

export interface Account {
    id: string
    userId: string
    user?: User

    type: AccountType
    active: boolean
}

export interface JointAccountInfo {
    id: string
    userId: string
    user?: User

    accountType?: string | null

    holder1Name?: string | null
    holder1Phone?: string | null
    holder1Niu?: string | null
    holder1Email?: string | null
    holder1Address?: string | null
    holder1Profession?: string | null
    holder1Employer?: string | null
    holder1IdNumber?: string | null
    holder1IdIssuer?: string | null
    holder1IdDate?: Date | null

    holder2Name?: string | null
    holder2Phone?: string | null
    holder2Niu?: string | null
    holder2Email?: string | null
    holder2Address?: string | null
    holder2Profession?: string | null
    holder2Employer?: string | null
    holder2IdNumber?: string | null
    holder2IdIssuer?: string | null
    holder2IdDate?: Date | null

    signatureType?: string | null
    signature1?: string | null
    signature2?: string | null
    declaration?: boolean | null
    terms1Accepted?: boolean | null
    terms2Accepted?: boolean | null
}

export interface Document {
    id: string
    userId: string
    user?: User

    frontCNI?: string | null
    backCNI?: string | null
}
