-- AlterTable
ALTER TABLE "public"."CustomEvent" ADD COLUMN     "storeId" TEXT;

-- AlterTable
ALTER TABLE "public"."Customer" ADD COLUMN     "storeId" TEXT;

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "storeId" TEXT;

-- AlterTable
ALTER TABLE "public"."OrderItem" ADD COLUMN     "storeId" TEXT;

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "storeId" TEXT;
