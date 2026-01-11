import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// English translations
const en = {
  translation: {
    // Common
    app_name: 'Kash-Flow',
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    actions: 'Actions',
    confirm: 'Confirm',
    close: 'Close',
    yes: 'Yes',
    no: 'No',
    
    // Navigation
    nav: {
      products: 'Products',
      sell: 'Sell',
      reports: 'Reports',
      analytics: 'Analytics',
      billing: 'Billing',
      profile: 'Profile & Settings',
      sign_out: 'Sign out',
      light_mode: 'Light Mode',
      dark_mode: 'Dark Mode',
    },
    
    // Profile
    profile: {
      title: 'Profile & Settings',
      subtitle: 'Manage your account and preferences',
      account_info: 'Account Information',
      subscription: 'Subscription',
      manage_plan: 'Manage your plan and billing',
      security: 'Security',
      security_desc: 'Manage your password and security settings',
      preferences: 'Preferences',
      danger_zone: 'Danger Zone',
      danger_desc: 'Irreversible and destructive actions',
    },
    
    // Auth
    auth: {
      sign_in: 'Sign In',
      sign_up: 'Create Account',
      sign_out: 'Sign Out',
      email: 'Email',
      password: 'Password',
      confirm_password: 'Confirm Password',
      store_name: 'Store Name',
      forgot_password: 'Forgot password?',
      no_account: "Don't have an account? Create one",
      have_account: 'Already have an account? Sign in',
      welcome_back: 'Welcome back! Sign in to continue',
      create_account: 'Create your account to get started',
      check_email: 'Check your email',
      email_sent: "We've sent a confirmation link to",
      reset_sent: "We've sent a password reset link to",
      click_to_activate: 'Click the link in the email to activate your account.',
      click_to_reset: 'Click the link in the email to reset your password.',
      back_to_signin: 'Back to Sign In',
      send_reset_link: 'Send Reset Link',
      update_password: 'Update Password',
      new_password: 'New Password',
      confirm_new_password: 'Confirm New Password',
      session_trouble: 'Having trouble? Clear session and try again',
      powered_by: 'Powered by FastAPI + React + Supabase',
    },
    
    // Products
    products: {
      title: 'Products',
      add_product: 'Add Product',
      edit_product: 'Edit Product',
      product_name: 'Product Name',
      product_code: 'Product Code',
      price: 'Price',
      quantity: 'Quantity',
      cost_price: 'Cost Price',
      no_products: 'No products found',
      delete_confirm: 'Are you sure you want to delete this product?',
      search_placeholder: 'Search products...',
      low_stock: 'Low Stock',
      out_of_stock: 'Out of Stock',
      in_stock: 'In Stock',
    },
    
    // Sell
    sell: {
      title: 'Sell',
      select_product: 'Select Product',
      quantity: 'Quantity',
      total: 'Total',
      complete_sale: 'Complete Sale',
      sale_success: 'Sale completed successfully!',
      insufficient_stock: 'Insufficient stock',
      recent_sales: 'Recent Sales',
    },
    
    // Reports
    reports: {
      title: 'Reports',
      daily_report: 'Daily Report',
      select_date: 'Select Date',
      total_sales: 'Total Sales',
      total_revenue: 'Total Revenue',
      total_profit: 'Total Profit',
      transactions: 'Transactions',
      no_transactions: 'No transactions for this date',
      export_csv: 'Export CSV',
    },
    
    // Analytics
    analytics: {
      title: 'Analytics',
      period: 'Period',
      days: 'days',
      revenue: 'Revenue',
      profit: 'Profit',
      sales_count: 'Sales Count',
      avg_transaction: 'Avg Transaction',
      profit_margin: 'Profit Margin',
      best_day: 'Best Day',
      worst_day: 'Worst Day',
      top_products: 'Top Products',
      sales_trends: 'Sales Trends',
      hourly_breakdown: 'Hourly Breakdown',
    },
    
    // Billing
    billing: {
      title: 'Choose Your Plan',
      subtitle: 'Start with a 7-day free trial. No credit card required to start.',
      current_plan: 'Current Plan',
      trial_days_left: 'Trial: {{days}} days left',
      active: 'Active',
      payment_failed: 'Payment Failed',
      canceled: 'Canceled',
      no_active_plan: 'No Active Plan',
      manage_subscription: 'Manage Subscription',
      start_trial: 'Start Free Trial',
      switch_plan: 'Switch Plan',
      current: 'Current',
      most_popular: 'Most Popular',
      whats_included: "What's included:",
      contact_sales: 'Need a custom plan for your enterprise?',
      contact_team: 'Contact our sales team',
      next_billing: 'Next billing date',
      trial_ends: 'Trial ends',
      pro: {
        name: 'Pro',
        price: 'R250',
        period: '/month',
        description: 'For growing businesses',
        features: [
          'Unlimited products',
          'Up to 3 users',
          'Advanced analytics',
          'Low stock alerts',
          'CSV export',
          'Priority support',
        ],
      },
      business: {
        name: 'Business',
        price: 'R350',
        period: '/month',
        description: 'For larger operations',
        features: [
          'Everything in Pro',
          'Unlimited users',
          'Role-based access',
          'Audit logs',
          'API access',
          'Dedicated support',
        ],
      },
    },
    
    // Alerts
    alerts: {
      low_stock_title: 'Low Stock Alerts',
      threshold: 'Threshold',
      items_below: 'items below threshold',
    },
    
    // Errors
    errors: {
      generic: 'Something went wrong',
      network: 'Network error. Please try again.',
      unauthorized: 'Please sign in to continue',
      forbidden: 'You do not have permission to do this',
      not_found: 'Not found',
    },
    
    // Success messages
    success: {
      saved: 'Saved successfully',
      deleted: 'Deleted successfully',
      updated: 'Updated successfully',
    },
  },
}

// Amharic translations
const am = {
  translation: {
    // Common
    app_name: 'ቀላል POS',
    loading: 'በመጫን ላይ...',
    save: 'አስቀምጥ',
    cancel: 'ሰርዝ',
    delete: 'ሰርዝ',
    edit: 'አስተካክል',
    add: 'ጨምር',
    search: 'ፈልግ',
    actions: 'እርምጃዎች',
    confirm: 'አረጋግጥ',
    close: 'ዝጋ',
    yes: 'አዎ',
    no: 'አይ',
    
    // Navigation
    nav: {
      products: 'ምርቶች',
      sell: 'ሽያጭ',
      reports: 'ሪፖርቶች',
      analytics: 'ትንተና',
      billing: 'ክፍያ',
      profile: 'መገለጫ እና ቅንብሮች',
      sign_out: 'ውጣ',
      light_mode: 'ብርሃን ሁነታ',
      dark_mode: 'ጨለማ ሁነታ',
    },
    
    // Profile
    profile: {
      title: 'መገለጫ እና ቅንብሮች',
      subtitle: 'መለያዎን እና ምርጫዎችዎን ያስተዳድሩ',
      account_info: 'የመለያ መረጃ',
      subscription: 'ደንበኝነት',
      manage_plan: 'ዕቅድዎን እና ክፍያዎን ያስተዳድሩ',
      security: 'ደህንነት',
      security_desc: 'የይለፍ ቃልዎን እና የደህንነት ቅንብሮችን ያስተዳድሩ',
      preferences: 'ምርጫዎች',
      danger_zone: 'አደገኛ ዞን',
      danger_desc: 'የማይቀለበሱ እና አጥፊ ድርጊቶች',
    },
    
    // Auth
    auth: {
      sign_in: 'ግባ',
      sign_up: 'ተመዝገብ',
      sign_out: 'ውጣ',
      email: 'ኢሜይል',
      password: 'የይለፍ ቃል',
      confirm_password: 'የይለፍ ቃል አረጋግጥ',
      store_name: 'የሱቅ ስም',
      forgot_password: 'የይለፍ ቃል ረሱ?',
      no_account: 'መለያ የለዎትም? አዲስ ይፍጠሩ',
      have_account: 'መለያ አለዎት? ይግቡ',
      welcome_back: 'እንኳን ደህና መጡ! ለመቀጠል ይግቡ',
      create_account: 'ለመጀመር መለያ ይፍጠሩ',
      check_email: 'ኢሜይልዎን ያረጋግጡ',
      email_sent: 'የማረጋገጫ ሊንክ ወደ ላክንልዎታል',
      reset_sent: 'የይለፍ ቃል ዳግም ማስጀመሪያ ሊንክ ወደ ላክንልዎታል',
      click_to_activate: 'መለያዎን ለማግበር በኢሜይል ውስጥ ያለውን ሊንክ ይጫኑ።',
      click_to_reset: 'የይለፍ ቃልዎን ዳግም ለማስጀመር በኢሜይል ውስጥ ያለውን ሊንክ ይጫኑ።',
      back_to_signin: 'ወደ መግቢያ ተመለስ',
      send_reset_link: 'ዳግም ማስጀመሪያ ሊንክ ላክ',
      update_password: 'የይለፍ ቃል አዘምን',
      new_password: 'አዲስ የይለፍ ቃል',
      confirm_new_password: 'አዲስ የይለፍ ቃል አረጋግጥ',
      session_trouble: 'ችግር አለብዎት? ክፍለ ጊዜን አጽዳ እና እንደገና ሞክር',
      powered_by: 'በ FastAPI + React + Supabase የተሰራ',
    },
    
    // Products
    products: {
      title: 'ምርቶች',
      add_product: 'ምርት ጨምር',
      edit_product: 'ምርት አስተካክል',
      product_name: 'የምርት ስም',
      product_code: 'የምርት ኮድ',
      price: 'ዋጋ',
      quantity: 'ብዛት',
      cost_price: 'የግዢ ዋጋ',
      no_products: 'ምንም ምርቶች አልተገኙም',
      delete_confirm: 'ይህን ምርት መሰረዝ እንደሚፈልጉ እርግጠኛ ነዎት?',
      search_placeholder: 'ምርቶችን ፈልግ...',
      low_stock: 'ዝቅተኛ ክምችት',
      out_of_stock: 'አልቋል',
      in_stock: 'በክምችት ውስጥ',
    },
    
    // Sell
    sell: {
      title: 'ሽያጭ',
      select_product: 'ምርት ምረጥ',
      quantity: 'ብዛት',
      total: 'ጠቅላላ',
      complete_sale: 'ሽያጭ ጨርስ',
      sale_success: 'ሽያጭ በተሳካ ሁኔታ ተጠናቋል!',
      insufficient_stock: 'በቂ ክምችት የለም',
      recent_sales: 'የቅርብ ጊዜ ሽያጮች',
    },
    
    // Reports
    reports: {
      title: 'ሪፖርቶች',
      daily_report: 'ዕለታዊ ሪፖርት',
      select_date: 'ቀን ምረጥ',
      total_sales: 'ጠቅላላ ሽያጮች',
      total_revenue: 'ጠቅላላ ገቢ',
      total_profit: 'ጠቅላላ ትርፍ',
      transactions: 'ግብይቶች',
      no_transactions: 'ለዚህ ቀን ምንም ግብይቶች የሉም',
      export_csv: 'CSV ላክ',
    },
    
    // Analytics
    analytics: {
      title: 'ትንተና',
      period: 'ጊዜ',
      days: 'ቀናት',
      revenue: 'ገቢ',
      profit: 'ትርፍ',
      sales_count: 'የሽያጭ ቁጥር',
      avg_transaction: 'አማካይ ግብይት',
      profit_margin: 'የትርፍ ህዳግ',
      best_day: 'ምርጥ ቀን',
      worst_day: 'መጥፎ ቀን',
      top_products: 'ከፍተኛ ምርቶች',
      sales_trends: 'የሽያጭ አዝማሚያዎች',
      hourly_breakdown: 'በሰዓት ክፍፍል',
    },
    
    // Billing
    billing: {
      title: 'እቅድዎን ይምረጡ',
      subtitle: 'በ7 ቀን ነፃ ሙከራ ይጀምሩ። ለመጀመር ክሬዲት ካርድ አያስፈልግም።',
      current_plan: 'የአሁኑ እቅድ',
      trial_days_left: 'ሙከራ፡ {{days}} ቀናት ቀርተዋል',
      active: 'ንቁ',
      payment_failed: 'ክፍያ አልተሳካም',
      canceled: 'ተሰርዟል',
      no_active_plan: 'ንቁ እቅድ የለም',
      manage_subscription: 'ምዝገባ አስተዳድር',
      start_trial: 'ነፃ ሙከራ ጀምር',
      switch_plan: 'እቅድ ቀይር',
      current: 'የአሁኑ',
      most_popular: 'በጣም ተወዳጅ',
      whats_included: 'የተካተተው፡',
      contact_sales: 'ለድርጅትዎ ብጁ እቅድ ያስፈልግዎታል?',
      contact_team: 'የሽያጭ ቡድናችንን ያግኙ',
      next_billing: 'ቀጣይ የክፍያ ቀን',
      trial_ends: 'ሙከራ የሚያበቃበት',
      pro: {
        name: 'ፕሮ',
        price: 'ብር 250',
        period: '/ወር',
        description: 'ለሚያድጉ ንግዶች',
        features: [
          'ያልተገደበ ምርቶች',
          'እስከ 3 ተጠቃሚዎች',
          'የላቀ ትንተና',
          'ዝቅተኛ ክምችት ማንቂያዎች',
          'CSV ወደ ውጭ መላክ',
          'ቅድሚያ ድጋፍ',
        ],
      },
      business: {
        name: 'ቢዝነስ',
        price: 'ብር 350',
        period: '/ወር',
        description: 'ለትላልቅ ስራዎች',
        features: [
          'በፕሮ ውስጥ ያለው ሁሉ',
          'ያልተገደበ ተጠቃሚዎች',
          'ሚና-ተኮር መዳረሻ',
          'የኦዲት ምዝግብ ማስታወሻዎች',
          'የ API መዳረሻ',
          'ወሳኝ ድጋፍ',
        ],
      },
    },
    
    // Alerts
    alerts: {
      low_stock_title: 'ዝቅተኛ ክምችት ማንቂያዎች',
      threshold: 'ገደብ',
      items_below: 'ከገደብ በታች ያሉ እቃዎች',
    },
    
    // Errors
    errors: {
      generic: 'የሆነ ችግር ተፈጥሯል',
      network: 'የአውታረ መረብ ስህተት። እባክዎ እንደገና ይሞክሩ።',
      unauthorized: 'ለመቀጠል እባክዎ ይግቡ',
      forbidden: 'ይህን ለማድረግ ፈቃድ የለዎትም',
      not_found: 'አልተገኘም',
    },
    
    // Success messages
    success: {
      saved: 'በተሳካ ሁኔታ ተቀምጧል',
      deleted: 'በተሳካ ሁኔታ ተሰርዟል',
      updated: 'በተሳካ ሁኔታ ተዘምኗል',
    },
  },
}

// Get saved language or detect from browser
const getSavedLanguage = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('language')
    if (saved) return saved
    
    // Detect Amharic from browser
    const browserLang = navigator.language || navigator.userLanguage
    if (browserLang?.startsWith('am')) return 'am'
  }
  return 'en'
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en,
      am,
    },
    lng: getSavedLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  })

// Save language preference
export const changeLanguage = (lang) => {
  i18n.changeLanguage(lang)
  if (typeof window !== 'undefined') {
    localStorage.setItem('language', lang)
  }
}

export default i18n

