import { changeCourseFilters, relatedCourseOptions } from '../../utils/courseFilters';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  MenuItem,
  TextField,
} from '@mui/material';
import {
  CircleCheck,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  PackageCheck,
  PackageX,
  Shirt,
  Truck,
  UsersRound,
  Wallet,
} from 'lucide-react';
import {
  getCourses,
  getStudents,
  getUniformOrders,
  getUniformStock,
} from '../../services/api';
import Money from '../../components/Money';
import { displayText } from '../../utils/displayText';
import { sizeDistribution, studentsWithoutUniform } from './uniformUtils';

const emptyFilters = { courseId: '', categoryId: '', levelId: '', modalityId: '' };
const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || 'Não foi possível carregar o Dashboard.';

export default function UniformDashboardPage() {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stock, setStock] = useState({ total: 0, sizes: [] });
  const [filters, setFilters] = useState(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([getCourses(), getStudents(), getUniformOrders(), getUniformStock()])
      .then(([loadedCourses, loadedStudents, loadedOrders, loadedStock]) => {
        if (!mounted) return;
        setCourses(loadedCourses.filter((course) => course.active));
        setStudents(loadedStudents);
        setOrders(loadedOrders);
        setStock(loadedStock);
      })
      .catch((loadError) => {
        if (mounted) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const selectedCourse = courses.find((course) => String(course.id) === filters.courseId);
  const relatedOptions = useMemo(
    () => relatedCourseOptions(courses, selectedCourse),
    [courses, selectedCourse],
  );
  const isReady = Object.values(filters).every(Boolean);
  const filteredOrders = useMemo(() => {
    if (!isReady) return [];
    return orders.filter((order) => (
      String(order.courseId) === filters.courseId
      && String(order.categoryId) === filters.categoryId
      && String(order.levelId) === filters.levelId
      && String(order.modalityId) === filters.modalityId
    ));
  }, [filters, isReady, orders]);
  const withoutUniform = useMemo(() => {
    if (!isReady) return [];
    return studentsWithoutUniform(
      students.filter((student) => String(student.courseId) === filters.courseId),
      filteredOrders,
    );
  }, [filteredOrders, filters.courseId, isReady, students]);
  const statistics = useMemo(() => filteredOrders.reduce((total, order) => ({
    count: total.count + 1,
    amount: total.amount + Number(order.amount),
    paid: total.paid + (order.paid ? Number(order.amount) : 0),
    paymentPending: total.paymentPending + (order.paid ? 0 : 1),
    paidCount: total.paidCount + (order.paid ? 1 : 0),
    deliveryPending: total.deliveryPending + (order.paid && !order.delivered ? 1 : 0),
    delivered: total.delivered + (order.delivered ? 1 : 0),
    awaitingStock: total.awaitingStock + (!order.delivered && order.observation !== '-' ? 1 : 0),
  }), {
    count: 0,
    amount: 0,
    paid: 0,
    paymentPending: 0,
    paidCount: 0,
    deliveryPending: 0,
    delivered: 0,
    awaitingStock: 0,
  }), [filteredOrders]);
  const distribution = useMemo(() => sizeDistribution(filteredOrders).map((item) => {
    const sizeOrders = filteredOrders.filter((order) => order.size === item.size);
    return {
      ...item,
      amount: sizeOrders.reduce((total, order) => total + Number(order.amount), 0),
      paid: sizeOrders.reduce((total, order) => total + (order.paid ? Number(order.amount) : 0), 0),
    };
  }), [filteredOrders]);

  const changeFilter = (key) => (event) => {
    const value = event.target.value;
    setFilters((current) => changeCourseFilters(courses, current, key, value));
  };
  const cards = [
    { label: 'Requisitados', value: statistics.count, icon: Shirt, detail: 'Uniformes requisitados' },
    { label: 'Pagamento pendente', value: statistics.paymentPending, icon: Clock3, detail: 'Aguardam pagamento' },
    { label: 'Pagos', value: statistics.paidCount, icon: CircleCheck, detail: 'Uniformes pagos' },
    { label: 'Entrega pendente', value: statistics.deliveryPending, icon: Truck, detail: 'Pagos por entregar' },
    { label: 'Entregues', value: statistics.delivered, icon: PackageCheck, detail: 'Uniformes entregues' },
    { label: 'Sem uniforme', value: withoutUniform.length, icon: UsersRound, detail: 'Estudantes sem uniforme pago' },
    { label: 'Sem stock', value: statistics.awaitingStock, icon: PackageX, detail: 'Pedidos sem stock ou tamanho' },
    { label: 'Valor total', value: <Money value={statistics.amount} />, icon: CircleDollarSign, detail: 'Total requisitado' },
    { label: 'Total pago', value: <Money value={statistics.paid} />, icon: Wallet, detail: 'Pagamentos registados' },
    { label: 'Saldo pendente', value: <Money value={statistics.amount - statistics.paid} />, icon: ClipboardList, detail: 'Por liquidar' },
  ];

  return (
    <section className="cacoin-course-page cacoin-tasks-page cacoin-task-dashboard cacoin-tests-dashboard">
      <header className="cacoin-page-heading">
        <div>
          <p className="cacoin-eyebrow">Estudantes</p>
          <h1>Dashboard</h1>
        </div>
      </header>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <section className="cacoin-task-dashboard-panel cacoin-tests-dashboard-filters">
        <header>
          <div>
            <h2>Filtros do relatório</h2>
          </div>
          <Shirt size={20} aria-hidden="true" />
        </header>
        <div className="cacoin-tests-dashboard-filter-grid">
          <TextField
            select
            size="small"
            label="Curso"
            value={filters.courseId}
            onChange={changeFilter('courseId')}
          >
            {courses.map((course) => (
              <MenuItem key={course.id} value={String(course.id)}>{displayText(course.name)}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Categoria"
            value={filters.categoryId}
            disabled={!selectedCourse}
            onChange={changeFilter('categoryId')}
          >
            {relatedOptions.categories.map((category) => (
              <MenuItem key={category.id} value={String(category.id)}>{displayText(category.name)}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Nível"
            value={filters.levelId}
            disabled={!selectedCourse}
            onChange={changeFilter('levelId')}
          >
            {relatedOptions.levels.map((level) => (
              <MenuItem key={level.id} value={String(level.id)}>{displayText(level.name)}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Modalidade"
            value={filters.modalityId}
            disabled={!selectedCourse}
            onChange={changeFilter('modalityId')}
          >
            {relatedOptions.modalities.map((modality) => (
              <MenuItem key={modality.id} value={String(modality.id)}>{displayText(modality.name)}</MenuItem>
            ))}
          </TextField>
        </div>
      </section>
      {isReady ? (
        <>
          <div className="cacoin-task-dashboard-cards">
            {cards.map(({ label, value, icon: Icon, detail }) => (
              <article className="cacoin-task-dashboard-card" key={label}>
                <span className="cacoin-task-dashboard-card-icon">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="cacoin-task-dashboard-card-label">{label}</span>
                <strong>{loading ? '—' : value}</strong>
                <small>{detail}</small>
              </article>
            ))}
          </div>
          <section className="cacoin-task-dashboard-panel cacoin-tests-dashboard-summary">
            <header>
              <div>
                <h2>Distribuição por tamanho</h2>
              </div>
              <CircleDollarSign size={20} aria-hidden="true" />
            </header>
            {distribution.length === 0 ? (
              <strong>Sem uniformes requisitados</strong>
            ) : (
              <div className="cacoin-tests-dashboard-types">
                {distribution.map((item) => (
                  <article key={item.size} className="cacoin-tests-dashboard-type">
                    <div>
                      <strong>{item.label}</strong>
                      <small>{item.count} requisitado(s)</small>
                    </div>
                    <dl>
                      <div><dt>Valor total</dt><dd><Money value={item.amount} /></dd></div>
                      <div><dt>Total pago</dt><dd><Money value={item.paid} /></dd></div>
                      <div><dt>Saldo pendente</dt><dd><Money value={item.amount - item.paid} /></dd></div>
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </section>
          <section className="cacoin-task-dashboard-panel cacoin-tests-dashboard-summary">
            <header>
              <div>
                <h2>Uniformes disponíveis em stock</h2>
              </div>
              <PackageCheck size={20} aria-hidden="true" />
            </header>
            <strong>{loading ? '—' : stock.total}</strong>
            <small>
              {stock.sizes.filter((item) => item.quantity > 0)
                .map((item) => `${item.quantity}-${item.size}`).join(', ') || 'Sem stock'}
            </small>
          </section>
        </>
      ) : (
        <section className="cacoin-task-dashboard-panel cacoin-tests-dashboard-empty">
          <Shirt size={26} aria-hidden="true" />
          <strong>Selecione os filtros para consultar as estatísticas</strong>
        </section>
      )}
    </section>
  );
}
