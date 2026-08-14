import funcUrls from '../../backend/func2url.json';

export const API = {
  auth: funcUrls.auth,
  products: funcUrls.products,
  comments: funcUrls.comments,
  admin: funcUrls.admin,
  presence: `${funcUrls.account}?resource=presence`,
  ads: `${funcUrls.account}?resource=ads`,
  vip: `${funcUrls.account}?resource=vip`,
  vipProducts: `${funcUrls.products}?vip=1`,
  support: `${funcUrls.account}?resource=support`,
  wallet: `${funcUrls.account}?resource=wallet`,
  myOrders: `${funcUrls.account}?resource=orders`,
  orderStatus: `${funcUrls.account}?resource=order-status`,
  paymentCreate: `${funcUrls.account}?resource=payment&action=create-order`,
  adTrack: `${funcUrls.account}?resource=ad-track`,
  news: `${funcUrls.account}?resource=news`,
  newsComments: `${funcUrls.account}?resource=news-comments`,
  userProfile: `${funcUrls.messages}?resource=profile`,
  conversations: `${funcUrls.messages}?resource=conversations`,
  messageThread: `${funcUrls.messages}?resource=thread`,
  sendMessage: funcUrls.messages,
};