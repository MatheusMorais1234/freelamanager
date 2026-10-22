// Helpers pra filtrar tudo por userId. "Nao e seu" responde igual a "nao existe" (404).

import { prisma } from "./prisma.js";

export async function ownsClient(clientId, userId) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId },
    select: { id: true },
  });

  return client !== null;
}

export async function ownsContract(contractId, userId) {
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, userId },
    select: { id: true },
  });

  return contract !== null;
}

// updateMany com id + userId; retorna true se alterou alguma linha
export async function updateOwned(model, id, userId, data) {
  const result = await model.updateMany({ where: { id, userId }, data });
  return result.count > 0;
}

export async function deleteOwned(model, id, userId) {
  const result = await model.deleteMany({ where: { id, userId } });
  return result.count > 0;
}
