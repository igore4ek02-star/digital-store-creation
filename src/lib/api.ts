import funcUrls from '../../backend/func2url.json';

export const API = {
  auth: funcUrls.auth,
  products: funcUrls.products,
  comments: funcUrls.comments,
  admin: funcUrls.admin,
  presence: `${funcUrls.account}?resource=presence`,
  ads: `${funcUrls.account}?resource=ads`,
  support: `${funcUrls.account}?resource=support`,
  wallet: `${funcUrls.account}?resource=wallet`,
  myOrders: `${funcUrls.account}?resource=orders`,
  orderStatus: `${funcUrls.account}?resource=order-status`,
  paymentCreate: `${funcUrls.account}?resource=payment&action=create-order`,
  adTrack: `${funcUrls.account}?resource=ad-track`,
  news: `${funcUrls.account}?resource=news`,
  newsComments: `${funcUrls.account}?resource=news-comments`,
};