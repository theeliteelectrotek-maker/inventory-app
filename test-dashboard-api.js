(async () => {
  try {
    const resStats = await fetch('http://localhost:3001/api/stats');
    const stats = await resStats.json();
    
    const resOnline = await fetch('http://localhost:3001/api/sales/online');
    const online = await resOnline.json();
    
    const resOffline = await fetch('http://localhost:3001/api/sales/offline');
    const offline = await resOffline.json();
    
    const resShops = await fetch('http://localhost:3001/api/shops');
    const shops = await resShops.json();
    
    const resReturns = await fetch('http://localhost:3001/api/returns');
    const rets = await resReturns.json();
    
    console.log("Stats Keys:", Object.keys(stats));
    console.log("Online isArray?", Array.isArray(online), "length:", online.length);
    console.log("Offline isArray?", Array.isArray(offline), "length:", offline.length);
    console.log("Shops isArray?", Array.isArray(shops), "length:", shops.length);
    console.log("Returns isArray?", Array.isArray(rets), "length:", rets.length);
    
    // Check specific fields used by Dashboard for first offline sale
    if (offline.length > 0) {
      console.log("Offline Date:", offline[0].date);
      console.log("Offline TotalAmount:", offline[0].totalAmount);
    }
  } catch(e) { console.error(e) }
})();
