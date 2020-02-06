export interface IDashbotEvent {
  name: string;
  // userId: string;
  // conversationId?: string;
}

export interface IDashbotCustomEvent extends IDashbotEvent {
  type: "customEvent";
  extraInfo?: any;
}
export interface IDashbotRevenueEvent extends IDashbotEvent {
  type: "revenueEvent";
  amount: number;
  referenceNumber?: string;
  metadata?: any;
}

export interface IDashbotPageLaunchEvent extends IDashbotEvent {
  type: "pageLaunchEvent";
  extraInfo?: any;
}

export interface IDashbotShareEvent extends IDashbotEvent {
  type: "shareEvent";
  sharedMessage?: any;
}

export interface IDashbotReferralEvent extends IDashbotEvent {
  type: "referralEvent";
  ref?: string;
  source?: string;
  ad_id?: string;
  referer_uri?: string;
}

export interface IDashbot {
  trackEvent: (
    event:
      | IDashbotCustomEvent
      | IDashbotRevenueEvent
      | IDashbotPageLaunchEvent
      | IDashbotShareEvent
      | IDashbotReferralEvent
  ) => Promise<any>;
}
