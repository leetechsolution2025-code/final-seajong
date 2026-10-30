"use client";

import React, { useState } from "react";
import { StepPage } from "@/components/common/StepPage";
import { Button } from "@/components/common/Button";
import type { ModernStepItem } from "@/types";
import { SeajongPlanTab } from "@/components/sales/plan/SeajongPlanTab";
import { OemPlanTab } from "@/components/sales/plan/OemPlanTab";

export function SalesPlanPage() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<string>("seajong");

  const steps: ModernStepItem[] = [
    {
      num: 1,
      id: "yearly",
      title: "Kế hoạch năm",
      desc: "Kế hoạch năm",
      icon: "bi-calendar-range",
    },
    {
      num: 2,
      id: "monthly",
      title: "Kế hoạch tháng",
      desc: "Kế hoạch tháng",
      icon: "bi-calendar3",
    },
  ];

  const stepperExtraRight = (
    <div className="d-flex align-items-center gap-2">
      <Button
        variant={activeTab === "seajong" ? "primary" : "outline"}
        size="sm"
        onClick={() => setActiveTab("seajong")}
      >
        SEAJONG
      </Button>
      <Button
        variant={activeTab === "oem" ? "primary" : "outline"}
        size="sm"
        onClick={() => setActiveTab("oem")}
      >
        OEM
      </Button>
    </div>
  );

  return (
    <div className="sales-plan-scope h-full w-full flex flex-col min-h-0" style={{ height: "100%" }}>
      <StepPage
        title="Lập kế hoạch"
        description="Quản lý và thiết lập các chỉ tiêu kinh doanh"
        color="blue"
        icon="bi-calendar-check"
        hideTicker={true}
        steps={steps}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        stepperExtraRight={stepperExtraRight}
      >
        <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ minHeight: 0 }}>
          {activeTab === "seajong" && (
            <SeajongPlanTab currentStep={currentStep} />
          )}

          {activeTab === "oem" && (
            <OemPlanTab currentStep={currentStep} />
          )}
        </div>
      </StepPage>

      <style>{`
        @keyframes pulse-danger {
          0% {
            transform: scale(0.85);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
          }
          100% {
            transform: scale(0.85);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }
        .pulse-danger-dot {
          animation: pulse-danger 1.5s infinite;
        }

        .plan-left-panel {
          background-color: transparent;
        }
        .plan-right-panel {
          background-color: transparent;
        }

        .sales-plan-scope .plan-subcard {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.04);
          overflow: hidden;
        }

        .sales-plan-scope .plan-subcard-header {
          padding: 0.65rem 1rem;
          background-color: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 44px;
        }

        .sales-plan-scope .plan-subcard-body {
          padding: 1rem;
        }

        .sales-plan-scope .plan-subcard thead tr:first-child th {
          border-top: none !important;
        }

        .sales-plan-scope .plan-subcard tbody tr:last-child td {
          border-bottom: none !important;
        }

        @media (max-width: 1200px) {
          .plan-left-panel {
            height: auto !important;
          }
          .plan-right-panel {
            height: auto !important;
          }
          .plan-row {
            flex-direction: column;
          }
        }

        /* Bootstrap 5 Grid & Layout Compatibility for SalesPlanPage */
        .sales-plan-scope .row {
          --bs-gutter-x: 1.5rem;
          --bs-gutter-y: 0;
          display: flex;
          flex-wrap: wrap;
          margin-top: calc(-1 * var(--bs-gutter-y));
          margin-right: calc(-0.5 * var(--bs-gutter-x));
          margin-left: calc(-0.5 * var(--bs-gutter-x));
        }
        .sales-plan-scope .row > * {
          box-sizing: border-box;
          flex-shrink: 0;
          width: 100%;
          max-width: 100%;
          padding-right: calc(var(--bs-gutter-x) * 0.5);
          padding-left: calc(var(--bs-gutter-x) * 0.5);
          margin-top: var(--bs-gutter-y);
        }
        .sales-plan-scope .g-0 { --bs-gutter-x: 0rem; --bs-gutter-y: 0rem; }
        .sales-plan-scope .g-1 { --bs-gutter-x: 0.25rem; --bs-gutter-y: 0.25rem; }
        .sales-plan-scope .g-2 { --bs-gutter-x: 0.5rem; --bs-gutter-y: 0.5rem; }
        .sales-plan-scope .g-3 { --bs-gutter-x: 1rem; --bs-gutter-y: 1rem; }
        .sales-plan-scope .g-4 { --bs-gutter-x: 1.5rem; --bs-gutter-y: 1.5rem; }

        .sales-plan-scope .col-4 { flex: 0 0 auto; width: 33.33333333%; }
        .sales-plan-scope .col-6 { flex: 0 0 auto; width: 50%; }
        .sales-plan-scope .col-8 { flex: 0 0 auto; width: 66.66666667%; }
        .sales-plan-scope .col-12 { flex: 0 0 auto; width: 100%; }

        @media (min-width: 768px) {
          .sales-plan-scope .col-md-4 { flex: 0 0 auto; width: 33.33333333%; }
          .sales-plan-scope .col-md-5 { flex: 0 0 auto; width: 41.66666667%; }
          .sales-plan-scope .col-md-6 { flex: 0 0 auto; width: 50%; }
          .sales-plan-scope .col-md-7 { flex: 0 0 auto; width: 58.33333333%; }
          .sales-plan-scope .col-md-8 { flex: 0 0 auto; width: 66.66666667%; }
          .sales-plan-scope .col-md-12 { flex: 0 0 auto; width: 100%; }
        }
        @media (min-width: 992px) {
          .sales-plan-scope .col-lg-3 { flex: 0 0 auto; width: 25%; }
          .sales-plan-scope .col-lg-4 { flex: 0 0 auto; width: 33.33333333%; }
          .sales-plan-scope .col-lg-6 { flex: 0 0 auto; width: 50%; }
          .sales-plan-scope .col-lg-8 { flex: 0 0 auto; width: 66.66666667%; }
          .sales-plan-scope .col-lg-12 { flex: 0 0 auto; width: 100%; }
          .sales-plan-scope .d-lg-block { display: block !important; }
        }
        @media (max-width: 1199.98px) {
          .sales-plan-scope .d-none.d-xl-block { display: none !important; }
        }
        @media (min-width: 1200px) {
          .sales-plan-scope .col-xl-3 { flex: 0 0 auto; width: 25%; }
          .sales-plan-scope .col-xl-4 { flex: 0 0 auto; width: 33.33333333%; }
          .sales-plan-scope .col-xl-5 { flex: 0 0 auto; width: 41.66666667%; }
          .sales-plan-scope .col-xl-6 { flex: 0 0 auto; width: 50%; }
          .sales-plan-scope .col-xl-7 { flex: 0 0 auto; width: 58.33333333%; }
          .sales-plan-scope .col-xl-8 { flex: 0 0 auto; width: 66.66666667%; }
          .sales-plan-scope .col-xl-9 { flex: 0 0 auto; width: 75%; }
          .sales-plan-scope .col-xl-12 { flex: 0 0 auto; width: 100%; }
          .sales-plan-scope .d-xl-block { display: block !important; }
          .sales-plan-scope .d-xl-flex { display: flex !important; }
        }

        /* Flex, sizing, spacing helpers */
        .sales-plan-scope .w-100 { width: 100% !important; }
        .sales-plan-scope .h-100 { height: 100% !important; }
        .sales-plan-scope .position-relative { position: relative !important; }
        .sales-plan-scope .position-absolute { position: absolute !important; }
        .sales-plan-scope .position-sticky { position: sticky !important; }
        .sales-plan-scope .top-0 { top: 0 !important; }
        .sales-plan-scope .top-50 { top: 50% !important; }
        .sales-plan-scope .bottom-0 { bottom: 0 !important; }
        .sales-plan-scope .start-0 { left: 0 !important; }
        .sales-plan-scope .end-0 { right: 0 !important; }
        .sales-plan-scope .translate-middle-y { transform: translateY(-50%) !important; }
        .sales-plan-scope .overflow-auto { overflow: auto !important; }
        .sales-plan-scope .overflow-hidden { overflow: hidden !important; }
        .sales-plan-scope .align-items-start { align-items: flex-start !important; }
        .sales-plan-scope .align-items-end { align-items: flex-end !important; }
        .sales-plan-scope .align-items-baseline { align-items: baseline !important; }
        .sales-plan-scope .align-items-stretch { align-items: stretch !important; }
        .sales-plan-scope .justify-content-end { justify-content: flex-end !important; }
        .sales-plan-scope .justify-content-start { justify-content: flex-start !important; }
        .sales-plan-scope .justify-content-around { justify-content: space-around !important; }

        .sales-plan-scope .m-0 { margin: 0 !important; }
        .sales-plan-scope .mt-0 { margin-top: 0 !important; }
        .sales-plan-scope .mt-1 { margin-top: 0.25rem !important; }
        .sales-plan-scope .mt-2 { margin-top: 0.5rem !important; }
        .sales-plan-scope .mt-3 { margin-top: 1rem !important; }
        .sales-plan-scope .mt-4 { margin-top: 1.5rem !important; }
        .sales-plan-scope .mt-auto { margin-top: auto !important; }
        .sales-plan-scope .mb-0 { margin-bottom: 0 !important; }
        .sales-plan-scope .mb-1 { margin-bottom: 0.25rem !important; }
        .sales-plan-scope .mb-2 { margin-bottom: 0.5rem !important; }
        .sales-plan-scope .mb-3 { margin-bottom: 1rem !important; }
        .sales-plan-scope .mb-4 { margin-bottom: 1.5rem !important; }
        .sales-plan-scope .ms-1 { margin-left: 0.25rem !important; }
        .sales-plan-scope .ms-2 { margin-left: 0.5rem !important; }
        .sales-plan-scope .ms-3 { margin-left: 1rem !important; }
        .sales-plan-scope .ms-auto { margin-left: auto !important; }
        .sales-plan-scope .me-1 { margin-right: 0.25rem !important; }
        .sales-plan-scope .me-2 { margin-right: 0.5rem !important; }
        .sales-plan-scope .me-3 { margin-right: 1rem !important; }
        .sales-plan-scope .mx-auto { margin-left: auto !important; margin-right: auto !important; }

        .sales-plan-scope .p-0 { padding: 0 !important; }
        .sales-plan-scope .p-1 { padding: 0.25rem !important; }
        .sales-plan-scope .p-2 { padding: 0.5rem !important; }
        .sales-plan-scope .p-3 { padding: 1rem !important; }
        .sales-plan-scope .p-4 { padding: 1.5rem !important; }
        .sales-plan-scope .pt-0 { padding-top: 0 !important; }
        .sales-plan-scope .pt-1 { padding-top: 0.25rem !important; }
        .sales-plan-scope .pt-2 { padding-top: 0.5rem !important; }
        .sales-plan-scope .pt-3 { padding-top: 1rem !important; }
        .sales-plan-scope .pb-0 { padding-bottom: 0 !important; }
        .sales-plan-scope .pb-1 { padding-bottom: 0.25rem !important; }
        .sales-plan-scope .pb-2 { padding-bottom: 0.5rem !important; }
        .sales-plan-scope .pb-3 { padding-bottom: 1rem !important; }
        .sales-plan-scope .ps-0 { padding-left: 0 !important; }
        .sales-plan-scope .ps-1 { padding-left: 0.25rem !important; }
        .sales-plan-scope .ps-2 { padding-left: 0.5rem !important; }
        .sales-plan-scope .ps-3 { padding-left: 1rem !important; }
        .sales-plan-scope .pe-0 { padding-right: 0 !important; }
        .sales-plan-scope .pe-2 { padding-right: 0.5rem !important; }
        .sales-plan-scope .pe-3 { padding-right: 1rem !important; }
        .sales-plan-scope .pe-4 { padding-right: 1.5rem !important; }
        .sales-plan-scope .px-0 { padding-left: 0 !important; padding-right: 0 !important; }
        .sales-plan-scope .px-1 { padding-left: 0.25rem !important; padding-right: 0.25rem !important; }
        .sales-plan-scope .px-2 { padding-left: 0.5rem !important; padding-right: 0.5rem !important; }
        .sales-plan-scope .px-3 { padding-left: 1rem !important; padding-right: 1rem !important; }
        .sales-plan-scope .px-4 { padding-left: 1.5rem !important; padding-right: 1.5rem !important; }
        .sales-plan-scope .py-0 { padding-top: 0 !important; padding-bottom: 0 !important; }
        .sales-plan-scope .py-1 { padding-top: 0.25rem !important; padding-bottom: 0.25rem !important; }
        .sales-plan-scope .py-2 { padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; }
        .sales-plan-scope .py-3 { padding-top: 1rem !important; padding-bottom: 1rem !important; }
        .sales-plan-scope .py-4 { padding-top: 1.5rem !important; padding-bottom: 1.5rem !important; }

        .sales-plan-scope .gap-1 { gap: 0.25rem !important; }
        .sales-plan-scope .gap-2 { gap: 0.5rem !important; }
        .sales-plan-scope .gap-3 { gap: 1rem !important; }
        .sales-plan-scope .gap-4 { gap: 1.5rem !important; }

        /* Typography & Colors */
        .sales-plan-scope .fw-normal { font-weight: 400 !important; }
        .sales-plan-scope .fw-medium { font-weight: 500 !important; }
        .sales-plan-scope .fw-semibold { font-weight: 600 !important; }
        .sales-plan-scope .fw-bold { font-weight: 700 !important; }
        .sales-plan-scope .fw-bolder { font-weight: 800 !important; }
        .sales-plan-scope .fst-italic { font-style: italic !important; }
        .sales-plan-scope .small { font-size: 0.875em !important; }
        .sales-plan-scope .text-start { text-align: left !important; }
        .sales-plan-scope .text-center { text-align: center !important; }
        .sales-plan-scope .text-end { text-align: right !important; }
        .sales-plan-scope .text-nowrap { white-space: nowrap !important; }
        .sales-plan-scope .text-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sales-plan-scope .text-uppercase { text-transform: uppercase !important; }

        .sales-plan-scope .text-primary { color: #0d6efd !important; }
        .sales-plan-scope .text-secondary { color: #6c757d !important; }
        .sales-plan-scope .text-success { color: #198754 !important; }
        .sales-plan-scope .text-danger { color: #dc3545 !important; }
        .sales-plan-scope .text-warning { color: #d97706 !important; }
        .sales-plan-scope .text-info { color: #0dcaf0 !important; }
        .sales-plan-scope .text-dark { color: #212529 !important; }
        .sales-plan-scope .text-muted { color: #64748b !important; }
        .sales-plan-scope .text-white { color: #ffffff !important; }

        .sales-plan-scope .bg-white { background-color: #ffffff !important; }
        .sales-plan-scope .bg-card { background-color: #ffffff !important; }
        .sales-plan-scope .bg-light { background-color: #f8f9fa !important; }
        .sales-plan-scope .bg-primary { background-color: #0d6efd !important; }
        .sales-plan-scope .bg-secondary { background-color: #6c757d !important; }
        .sales-plan-scope .bg-success { background-color: #198754 !important; }
        .sales-plan-scope .bg-danger { background-color: #dc3545 !important; }
        .sales-plan-scope .bg-warning { background-color: #ffc107 !important; }
        .sales-plan-scope .bg-info { background-color: #0dcaf0 !important; }
        .sales-plan-scope .bg-transparent { background-color: transparent !important; }

        /* Borders & Rounded & Shadows */
        .sales-plan-scope .border { border: 1px solid #dee2e6 !important; }
        .sales-plan-scope .border-0 { border: 0 !important; }
        .sales-plan-scope .border-top { border-top: 1px solid #dee2e6 !important; }
        .sales-plan-scope .border-bottom { border-bottom: 1px solid #dee2e6 !important; }
        .sales-plan-scope .border-start { border-left: 1px solid #dee2e6 !important; }
        .sales-plan-scope .border-end { border-right: 1px solid #dee2e6 !important; }
        .sales-plan-scope .border-light-subtle { border-color: #e2e8f0 !important; }

        .sales-plan-scope .rounded { border-radius: 0.375rem !important; }
        .sales-plan-scope .rounded-0 { border-radius: 0 !important; }
        .sales-plan-scope .rounded-1 { border-radius: 0.25rem !important; }
        .sales-plan-scope .rounded-2 { border-radius: 0.375rem !important; }
        .sales-plan-scope .rounded-3 { border-radius: 0.5rem !important; }
        .sales-plan-scope .rounded-4 { border-radius: 0.75rem !important; }
        .sales-plan-scope .rounded-circle { border-radius: 50% !important; }
        .sales-plan-scope .rounded-pill { border-radius: 50rem !important; }

        .sales-plan-scope .shadow-none { box-shadow: none !important; }
        .sales-plan-scope .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important; }
        .sales-plan-scope .shadow { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important; }

        /* Cards & Badges */
        .sales-plan-scope .card {
          position: relative;
          display: flex;
          flex-direction: column;
          min-width: 0;
          word-wrap: break-word;
          background-color: #fff;
          background-clip: border-box;
          border: 1px solid #dee2e6;
          border-radius: 0.5rem;
        }
        .sales-plan-scope .card-body {
          flex: 1 1 auto;
          padding: 1rem;
        }
        .sales-plan-scope .badge {
          display: inline-block;
          padding: 0.25em 0.6em;
          font-size: 0.75em;
          font-weight: 700;
          line-height: 1;
          text-align: center;
          white-space: nowrap;
          vertical-align: baseline;
          border-radius: 0.375rem;
        }

        /* Table inline inputs & Input groups */
        .sales-plan-scope .form-control {
          display: block;
          width: 100%;
          padding: 0.375rem 0.75rem;
          font-size: 0.875rem;
          font-weight: 500;
          line-height: 1.5;
          color: #0f172a;
          background-color: #fff;
          border: 1px solid #cbd5e1;
          border-radius: 0.375rem;
          box-sizing: border-box;
        }
        .sales-plan-scope .form-control-sm {
          min-height: calc(1.5em + 0.5rem + 2px);
          padding: 0.25rem 0.5rem;
          font-size: 0.8125rem;
          border-radius: 0.25rem;
        }
        .sales-plan-scope .form-control:focus {
          border-color: #86b7fe;
          outline: 0;
          box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.2);
        }
        .sales-plan-scope .input-group {
          position: relative;
          display: flex;
          flex-wrap: nowrap;
          align-items: stretch;
          width: 100%;
        }
        .sales-plan-scope .input-group > .form-control {
          position: relative;
          flex: 1 1 auto;
          width: 1%;
          min-width: 0;
        }
        .sales-plan-scope .input-group > :not(:first-child) {
          margin-left: -1px;
          border-top-left-radius: 0 !important;
          border-bottom-left-radius: 0 !important;
        }
        .sales-plan-scope .input-group > :not(:last-child) {
          border-top-right-radius: 0 !important;
          border-bottom-right-radius: 0 !important;
        }
        .sales-plan-scope .input-group-text {
          display: flex;
          align-items: center;
          padding: 0.25rem 0.5rem;
          font-size: 0.8125rem;
          font-weight: 500;
          line-height: 1.5;
          color: #475569;
          text-align: center;
          white-space: nowrap;
          background-color: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 0.375rem;
        }
        .sales-plan-scope .input-group-sm > .form-control,
        .sales-plan-scope .input-group-sm > .input-group-text {
          padding: 0.2rem 0.45rem;
          font-size: 0.8125rem;
          border-radius: 0.25rem;
        }

        /* Progress Bars */
        .sales-plan-scope .progress {
          display: flex;
          height: 0.5rem;
          overflow: hidden;
          font-size: 0.75rem;
          background-color: #e9ecef;
          border-radius: 0.375rem;
        }
        .sales-plan-scope .progress-bar {
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow: hidden;
          color: #fff;
          text-align: center;
          white-space: nowrap;
          background-color: #0d6efd;
          transition: width 0.6s ease;
        }
      `}</style>
    </div>
  );
}

export default SalesPlanPage;
