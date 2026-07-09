const fs = require('fs');

const contentToAppend = `
![Farming Landscape](/images/farming_landscape.png)

## 26. Government Schemes Every Farmer Should Know

The Government of India and the Karnataka State Government offer several schemes to support farmers financially, improve agricultural productivity, and reduce farming risks. One of the most beneficial schemes is the Pradhan Mantri Kisan Samman Nidhi (PM-KISAN), which provides eligible farming families with ₹6,000 per year in three equal installments. This financial assistance can be used to purchase seeds, fertilizers, pesticides, or other essential farming inputs, helping farmers manage cultivation expenses without depending entirely on loans.

Another important scheme is the Pradhan Mantri Fasal Bima Yojana (PMFBY), a crop insurance program that protects farmers against crop losses caused by natural disasters and unforeseen events. If crops are damaged due to floods, droughts, cyclones, landslides, pest attacks, or diseases, farmers enrolled in the scheme receive financial compensation. Crop insurance helps reduce financial stress and enables farmers to recover and continue farming even after significant losses.

The Soil Health Card Scheme encourages farmers to improve soil fertility through scientific soil testing. Under this scheme, soil samples from farms are analyzed to determine nutrient levels and deficiencies. Farmers receive a Soil Health Card containing recommendations on the appropriate fertilizers and nutrients required for their land. Following these recommendations improves crop yields, reduces unnecessary fertilizer use, lowers cultivation costs, and helps maintain soil health over the long term.

![Modern Irrigation](/images/modern_irrigation.png)

To improve irrigation efficiency and conserve water, farmers can benefit from the Pradhan Mantri Krishi Sinchai Yojana (PMKSY). This scheme promotes the adoption of modern irrigation techniques such as drip irrigation and sprinkler irrigation while also supporting water conservation projects and rainwater harvesting systems. By using water more efficiently, farmers can improve crop productivity, reduce water wastage, and cultivate crops even during periods of limited rainfall.

The Kisan Credit Card (KCC) scheme provides farmers with easy access to low-interest agricultural loans. These loans can be used to purchase seeds, fertilizers, pesticides, farm machinery, irrigation equipment, livestock, and other farming inputs. The KCC scheme reduces dependence on private moneylenders and ensures that farmers have adequate working capital throughout the cropping season.

Farmers can also take advantage of the National Agriculture Market (e-NAM), an online agricultural marketing platform that connects farmers with buyers across different markets. Through e-NAM, farmers can compare prices in multiple markets, access a larger network of buyers, sell their produce more competitively, and receive better returns by choosing the most profitable market rather than relying solely on local traders.

In addition to central government initiatives, the Karnataka State Government offers several schemes to promote sustainable and profitable agriculture. These include subsidies for purchasing agricultural machinery, financial assistance for installing drip and sprinkler irrigation systems, distribution of certified seeds and quality planting materials, support for organic farming practices, farmer training and skill development programs, horticulture development assistance, and subsidies for establishing polyhouses and shade-net cultivation. Farmers are encouraged to visit their nearest Raitha Samparka Kendra (RSK) or the local Department of Agriculture office to obtain information about current schemes, eligibility requirements, and application procedures.

![Farmers Market](/images/farmers_market.png)

## 27. Market Planning

Successful farming depends not only on producing healthy crops but also on selling them at the right time and at profitable prices. Before deciding which crop to cultivate, farmers should study current market demand and understand which crops are expected to provide better returns during the upcoming season. Estimating production costs, including seeds, fertilizers, labor, irrigation, and transportation, allows farmers to calculate potential profits before planting. Identifying potential buyers in advance, such as local markets, wholesalers, cooperatives, or food processing companies, helps farmers plan their sales more effectively. Monitoring daily market prices through agricultural market reports or mobile applications enables farmers to choose the best time to sell their produce. When market prices are temporarily low, farmers with suitable storage facilities may benefit from storing their produce and selling it later when prices improve. Proper market planning helps maximize income and reduces the risk of financial losses.

## 28. Modern Technology for Farmers

Modern technology has become an essential tool for improving agricultural productivity and reducing farming risks. Farmers can use mobile applications to receive real-time weather forecasts, allowing them to plan irrigation, fertilizer application, and harvesting activities more effectively. Soil testing services help farmers identify nutrient deficiencies and apply the correct fertilizers, improving crop growth while reducing unnecessary expenses. GPS-based field mapping and digital farm records assist in monitoring crop performance and planning future cultivation activities. Mobile applications equipped with artificial intelligence can identify pests and crop diseases from photographs, enabling farmers to take timely corrective measures. Digital platforms also provide daily market price updates, helping farmers sell their produce at the most favorable prices. Online consultations with agricultural experts and extension officers allow farmers to receive professional guidance without traveling long distances. Automated irrigation systems further improve water efficiency by supplying crops with the right amount of water at the right time. By adopting these technologies, farmers can increase productivity, reduce input costs, and make better-informed farming decisions throughout the growing season.

![Sustainable Farming](/images/sustainable_farming.png)

## 29. Sustainable Farming

Sustainable farming focuses on protecting natural resources while ensuring long-term agricultural productivity and profitability. Farmers should minimize the excessive use of chemical fertilizers and pesticides by adopting integrated nutrient management and integrated pest management practices whenever possible. Planting trees along farm boundaries helps reduce soil erosion, improves biodiversity, and provides additional environmental benefits. Rainwater harvesting allows farmers to store excess monsoon rainfall for use during dry periods, reducing dependence on groundwater. Protecting pollinators such as bees is essential because they play a vital role in the pollination of many fruit, vegetable, and plantation crops. Crop rotation should be practiced regularly to maintain soil fertility, reduce pest infestations, and prevent the depletion of essential nutrients. Instead of burning crop residues after harvest, farmers should compost them to produce valuable organic manure that improves soil structure and fertility. Growing multiple crops rather than relying on a single crop also increases biodiversity and reduces the risk of complete crop failure. By adopting sustainable farming practices, farmers can lower production costs, improve soil health, conserve water resources, protect the environment, and ensure that their farmland remains productive for future generations.
`;

fs.appendFileSync('src/content/guide_en.md', '\\n' + contentToAppend);
console.log('Appended content successfully.');
