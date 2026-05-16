-- CreateEnum
CREATE TYPE "work_order_status" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "work_order_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "DeviceCategory" AS ENUM ('ENVIRONMENTAL', 'SECURITY', 'ENTERTAINMENT');

-- CreateEnum
CREATE TYPE "anomaly_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "anomaly_report_status" AS ENUM ('NEW', 'REVIEWED', 'COMPLETED', 'ERROR');

-- CreateEnum
CREATE TYPE "anomaly_finding_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "anomaly_trigger_type" AS ENUM ('SCHEDULED', 'MANUAL');

-- CreateEnum
CREATE TYPE "anomaly_detection_job_status" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('THERMOSTAT', 'LIGHT', 'SMOKEDETECTOR', 'WATERSENSOR', 'LOCK', 'CAMERA', 'DOORBELL', 'MOTIONSENSOR', 'WINDOWSENSOR', 'SPEAKER', 'TV', 'ALARM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "type" TEXT,
    "imageUrl" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "owner_id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "anomalyCheckEnabled" BOOLEAN NOT NULL DEFAULT true,
    "anomalyCheckSchedule" TEXT,
    "last_anomaly_check_run_at" TIMESTAMP(3),

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DeviceType" NOT NULL,
    "category" "DeviceCategory" NOT NULL,
    "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "state" JSONB,
    "last_connected" TIMESTAMP(3),
    "last_controlled_at" TIMESTAMP(3),
    "last_control_command" TEXT,
    "property_id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "details" TEXT,
    "data" JSONB,
    "device_id" TEXT,
    "user_id" TEXT,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "check_in" TIMESTAMP(3) NOT NULL,
    "check_out" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "property_id" TEXT NOT NULL,
    "guest_id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "details" TEXT,
    "status" "work_order_status" NOT NULL DEFAULT 'PENDING',
    "priority" "work_order_priority" NOT NULL DEFAULT 'MEDIUM',
    "reported_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_date" TIMESTAMP(3),
    "completed_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "property_id" TEXT NOT NULL,
    "reported_by_id" TEXT,
    "assigned_user_id" TEXT,
    "deviceId" TEXT,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_readings" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "device_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "device_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anomaly_detection_jobs" (
    "id" TEXT NOT NULL,
    "status" "anomaly_detection_job_status" NOT NULL DEFAULT 'PENDING',
    "triggerType" "anomaly_trigger_type" NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "property_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "anomaly_report_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anomaly_detection_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anomaly_reports" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "status" "anomaly_report_status" NOT NULL DEFAULT 'NEW',
    "triggerType" "anomaly_trigger_type" NOT NULL,
    "property_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "deviceId" TEXT,

    CONSTRAINT "anomaly_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anomaly_report_findings" (
    "id" TEXT NOT NULL,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metric" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" "anomaly_finding_status" NOT NULL DEFAULT 'PENDING',
    "suggested_command" JSONB,
    "resolutionDetails" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_user_id" TEXT,
    "device_id" TEXT NOT NULL,
    "anomaly_report_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anomaly_report_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PropertyQuickAccessDevices" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PropertyQuickAccessDevices_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Verification_identifier_value_key" ON "Verification"("identifier", "value");

-- CreateIndex
CREATE INDEX "properties_name_idx" ON "properties"("name");

-- CreateIndex
CREATE INDEX "properties_tenantId_idx" ON "properties"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "properties_tenantId_name_key" ON "properties"("tenantId", "name");

-- CreateIndex
CREATE INDEX "devices_property_id_idx" ON "devices"("property_id");

-- CreateIndex
CREATE INDEX "devices_tenantId_idx" ON "devices"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "devices_name_property_id_key" ON "devices"("name", "property_id");

-- CreateIndex
CREATE INDEX "events_device_id_idx" ON "events"("device_id");

-- CreateIndex
CREATE INDEX "events_type_idx" ON "events"("type");

-- CreateIndex
CREATE INDEX "events_timestamp_idx" ON "events"("timestamp");

-- CreateIndex
CREATE INDEX "events_tenantId_idx" ON "events"("tenantId");

-- CreateIndex
CREATE INDEX "reservations_property_id_idx" ON "reservations"("property_id");

-- CreateIndex
CREATE INDEX "reservations_guest_id_idx" ON "reservations"("guest_id");

-- CreateIndex
CREATE INDEX "reservations_check_in_idx" ON "reservations"("check_in");

-- CreateIndex
CREATE INDEX "reservations_check_out_idx" ON "reservations"("check_out");

-- CreateIndex
CREATE INDEX "reservations_tenantId_idx" ON "reservations"("tenantId");

-- CreateIndex
CREATE INDEX "work_orders_property_id_idx" ON "work_orders"("property_id");

-- CreateIndex
CREATE INDEX "work_orders_status_idx" ON "work_orders"("status");

-- CreateIndex
CREATE INDEX "work_orders_priority_idx" ON "work_orders"("priority");

-- CreateIndex
CREATE INDEX "work_orders_assigned_user_id_idx" ON "work_orders"("assigned_user_id");

-- CreateIndex
CREATE INDEX "work_orders_tenantId_idx" ON "work_orders"("tenantId");

-- CreateIndex
CREATE INDEX "device_readings_device_id_timestamp_idx" ON "device_readings"("device_id", "timestamp");

-- CreateIndex
CREATE INDEX "device_readings_metric_idx" ON "device_readings"("metric");

-- CreateIndex
CREATE INDEX "device_readings_tenant_id_idx" ON "device_readings"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "anomaly_detection_jobs_anomaly_report_id_key" ON "anomaly_detection_jobs"("anomaly_report_id");

-- CreateIndex
CREATE INDEX "anomaly_detection_jobs_property_id_idx" ON "anomaly_detection_jobs"("property_id");

-- CreateIndex
CREATE INDEX "anomaly_detection_jobs_tenant_id_idx" ON "anomaly_detection_jobs"("tenant_id");

-- CreateIndex
CREATE INDEX "anomaly_detection_jobs_status_idx" ON "anomaly_detection_jobs"("status");

-- CreateIndex
CREATE INDEX "anomaly_reports_property_id_idx" ON "anomaly_reports"("property_id");

-- CreateIndex
CREATE INDEX "anomaly_reports_tenant_id_idx" ON "anomaly_reports"("tenant_id");

-- CreateIndex
CREATE INDEX "anomaly_reports_status_idx" ON "anomaly_reports"("status");

-- CreateIndex
CREATE INDEX "anomaly_report_findings_device_id_idx" ON "anomaly_report_findings"("device_id");

-- CreateIndex
CREATE INDEX "anomaly_report_findings_severity_idx" ON "anomaly_report_findings"("severity");

-- CreateIndex
CREATE INDEX "anomaly_report_findings_tenant_id_idx" ON "anomaly_report_findings"("tenant_id");

-- CreateIndex
CREATE INDEX "anomaly_report_findings_metric_idx" ON "anomaly_report_findings"("metric");

-- CreateIndex
CREATE INDEX "anomaly_report_findings_anomaly_report_id_idx" ON "anomaly_report_findings"("anomaly_report_id");

-- CreateIndex
CREATE INDEX "tenants_ownerId_idx" ON "tenants"("ownerId");

-- CreateIndex
CREATE INDEX "_PropertyQuickAccessDevices_B_index" ON "_PropertyQuickAccessDevices"("B");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_readings" ADD CONSTRAINT "device_readings_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_readings" ADD CONSTRAINT "device_readings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_detection_jobs" ADD CONSTRAINT "anomaly_detection_jobs_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_detection_jobs" ADD CONSTRAINT "anomaly_detection_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_detection_jobs" ADD CONSTRAINT "anomaly_detection_jobs_anomaly_report_id_fkey" FOREIGN KEY ("anomaly_report_id") REFERENCES "anomaly_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_reports" ADD CONSTRAINT "anomaly_reports_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_reports" ADD CONSTRAINT "anomaly_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_reports" ADD CONSTRAINT "anomaly_reports_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_report_findings" ADD CONSTRAINT "anomaly_report_findings_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_report_findings" ADD CONSTRAINT "anomaly_report_findings_anomaly_report_id_fkey" FOREIGN KEY ("anomaly_report_id") REFERENCES "anomaly_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_report_findings" ADD CONSTRAINT "anomaly_report_findings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PropertyQuickAccessDevices" ADD CONSTRAINT "_PropertyQuickAccessDevices_A_fkey" FOREIGN KEY ("A") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PropertyQuickAccessDevices" ADD CONSTRAINT "_PropertyQuickAccessDevices_B_fkey" FOREIGN KEY ("B") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
