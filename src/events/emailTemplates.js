exports.woApproved = (wo) => ({
  subject: "[CMMS] Work Order Approved",
  html: `
    <h3>Work Order Approved</h3>
    <p><b>${wo.title}</b></p>
  `,
});

exports.techAssigned = (wo) => ({
  subject: "[CMMS] New Work Order Assigned",
  html: `
    <h3>You have been assigned a work order</h3>
    <p><b>${wo.title}</b></p>
  `,
});

exports.slaBreached = (wo) => ({
  subject: "[CMMS] SLA Breached",
  html: `
    <h3>SLA Breached</h3>
    <p><b>${wo.title}</b></p>
  `,
});

exports.pmCreated = (wo) => ({
  subject: "[CMMS] Preventive Maintenance Created",
  html: `
    <h3>New PM Work Order</h3>
    <p><b>${wo.title}</b></p>
  `,
});

exports.tenantRequest = (tr) => ({
  subject: "[CMMS] New Tenant Request Submitted",
  html: `
    <h3>New Tenant Request</h3>
    <p><b>${tr.title}</b></p>
    <p>Tenant: ${tr.tenantName}</p>
    <p>Email: ${tr.tenantEmail}</p>
  `,
});
