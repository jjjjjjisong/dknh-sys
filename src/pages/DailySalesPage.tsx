import PageHeader from '../components/PageHeader';
import PlaceholderPanel from '../components/PlaceholderPanel';

export default function DailySalesPage() {
  return (
    <div className="page-content">
      <PageHeader
        title="일일판매"
        description="일자별 판매 현황을 조회하고 일일 실적을 확인하는 화면입니다."
      />

      <PlaceholderPanel
        title="일일판매 화면 준비 중"
        message="거래처별, 품목별, 날짜별 판매 내역과 합계 정보를 여기에 연결할 수 있습니다."
      />
    </div>
  );
}
