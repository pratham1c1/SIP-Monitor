export default function PurchaseMarker({ purchase }) {
  return (
    <div>
      Bought: {purchase.shares} shares · ₹
      {Number(purchase.price).toLocaleString("en-IN", {
        maximumFractionDigits: 2,
      })}
    </div>
  );
}
